from flask import Flask, jsonify

from .handlers.auth_handler import auth_bp
from .handlers.company_handler import company_bp
from .handlers.daily_entry_handler import daily_entry_bp


def create_app():
    app = Flask(__name__)

    app.register_blueprint(auth_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(daily_entry_bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)