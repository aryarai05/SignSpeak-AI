import os
from flask import Flask, render_template, jsonify
from config import Config
from database.database import init_db
from api.routes import api_bp

def create_app():
    """Application factory for SignSpeak AI."""
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    app.jinja_env.auto_reload = True

    # Initialize SQLite database
    init_db()

    # Register API and Web routes
    app.register_blueprint(api_bp)

    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        if request_wants_json():
            return jsonify({"success": False, "error": "Resource not found", "status_code": 404}), 404
        return render_template("index.html"), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({
            "success": False,
            "error": "File size exceeds limit (Maximum 16MB allowed)",
            "status_code": 413
        }), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({
            "success": False,
            "error": "Internal server processing error. Please retry.",
            "status_code": 500
        }), 500

    def request_wants_json():
        from flask import request
        best = request.accept_mimetypes.best_match(['application/json', 'text/html'])
        return best == 'application/json' and \
            request.accept_mimetypes[best] > \
            request.accept_mimetypes['text/html']

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 65)
    print("   SignSpeak AI — Real-Time Sign Language Recognition System")
    print(f"   Server running on: http://127.0.0.1:{port}")
    print("=" * 65)
    app.run(host="0.0.0.0", port=port, debug=False)
