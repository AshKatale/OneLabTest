"""
Flask application for reconciliation system.
Provides endpoints for data generation and reconciliation.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from services.data_generator import DataGenerator
from services.reconciler import Reconciler

# Initialize Flask app
app = Flask(
    __name__,
    instance_relative_config=False
)

# Enable CORS to allow frontend requests
CORS(app, resources={r"/*": {"origins": "*"}})

# Global state (in-memory storage)
data_state = {
    "transactions": [],
    "settlements": [],
    "last_generated": None
}


# ============================================================================
# Helper Functions
# ============================================================================

def get_request_data(default_data=None):
    """
    Get JSON request data, handling both POST body and form data.
    
    Args:
        default_data: Default data to return if no data found
        
    Returns:
        Dictionary of request data or default_data
    """
    if default_data is None:
        default_data = {}
    
    try:
        if request.is_json:
            return request.get_json() or default_data
        else:
            return request.form.to_dict() or default_data
    except Exception:
        return default_data


# ============================================================================
# API Endpoints
# ============================================================================

@app.route("/", methods=["GET"])
def root():
    """Health check endpoint."""
    return jsonify({
        "message": "Reconciliation System API",
        "status": "running",
        "endpoints": [
            "/generate-data",
            "/reconcile",
            "/data-status",
            "/transactions",
            "/settlements"
        ]
    })


@app.route("/generate-data", methods=["POST"])
def generate_data():
    """
    Generate synthetic transactions and settlements data.
    
    Request Body (JSON):
        transaction_count (int): Number of transactions to generate (default: 50)
    
    Returns:
        JSON with generated transactions and settlements
    """
    try:
        request_data = get_request_data()
        count = int(request_data.get("transaction_count", 50))
        
        # Generate data
        generator = DataGenerator()
        data = generator.get_all_data(transaction_count=count)
        
        # Store in memory
        data_state["transactions"] = data["transactions"]
        data_state["settlements"] = data["settlements"]
        data_state["last_generated"] = data["generated_at"]
        
        return jsonify({
            "status": "success",
            "message": f"Generated {count} transactions and {len(data['settlements'])} settlements",
            "data": {
                "transaction_count": len(data["transactions"]),
                "settlement_count": len(data["settlements"]),
                "sample_transactions": data["transactions"][:3],
                "sample_settlements": data["settlements"][:3],
                "generated_at": data["generated_at"]
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 400


@app.route("/reconcile", methods=["POST"])
def reconcile():
    """
    Run reconciliation logic on generated data.
    
    Request Body (JSON):
        target_month (str): Target month in YYYY-MM format (default: 2026-03)
    
    Returns:
        JSON with reconciliation summary and detected issues
    """
    try:
        # Check if data exists
        if not data_state["transactions"] or not data_state["settlements"]:
            return jsonify({
                "status": "error",
                "message": "No data generated yet. Please call /generate-data first.",
                "data": None
            }), 400
        
        request_data = get_request_data()
        target_month = request_data.get("target_month", "2026-03")
        
        # Run reconciliation
        reconciler = Reconciler(tolerance=0.01)
        result = reconciler.reconcile(
            transactions=data_state["transactions"],
            settlements=data_state["settlements"],
            target_month=target_month
        )
        
        return jsonify({
            "status": "success",
            "message": f"Reconciliation completed for {target_month}",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": None
        }), 400


@app.route("/data-status", methods=["GET"])
def data_status():
    """
    Get current data status without regenerating.
    
    Returns:
        Current data state and counts
    """
    return jsonify({
        "status": "success",
        "data": {
            "transactions_count": len(data_state["transactions"]),
            "settlements_count": len(data_state["settlements"]),
            "last_generated": data_state["last_generated"],
            "has_data": bool(data_state["transactions"])
        }
    }), 200


@app.route("/transactions", methods=["GET"])
def get_transactions():
    """Get all stored transactions."""
    return jsonify({
        "status": "success",
        "data": data_state["transactions"]
    }), 200


@app.route("/settlements", methods=["GET"])
def get_settlements():
    """Get all stored settlements."""
    return jsonify({
        "status": "success",
        "data": data_state["settlements"]
    }), 200


# ============================================================================
# Error Handling
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        "status": "error",
        "message": "Endpoint not found",
        "data": None
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors."""
    return jsonify({
        "status": "error",
        "message": "Method not allowed",
        "data": None
    }), 405


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        "status": "error",
        "message": f"Internal server error: {str(error)}",
        "data": None
    }), 500


# ============================================================================
# Main entry point
# ============================================================================

if __name__ == "__main__":
    print("Starting Reconciliation System API with Flask...")
    print("Server: http://localhost:8000")
    print("Press CTRL+C to quit")
    
    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True,
        use_reloader=True
    )
