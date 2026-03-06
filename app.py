from flask import Flask, render_template, request, redirect, session
import mysql.connector
from flask_mail import Mail, Message

app = Flask(__name__)
app.secret_key = "shieldhersecret"

# -------------------------
# EMAIL CONFIGURATION
# -------------------------
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USERNAME'] = 'shieldher4gmail@gmail.com'      # change
app.config['MAIL_PASSWORD'] = 'shield@1234'          # change
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False

mail = Mail(app)

# -------------------------
# DATABASE CONNECTION
# -------------------------
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Par@12345",
    database="shieldher"
)

cursor = db.cursor()

# -------------------------
# AI DISTRESS DETECTION
# -------------------------
def detect_distress(text):

    distress_words = [
        "help",
        "danger",
        "attack",
        "unsafe",
        "scared",
        "emergency",
        "kidnap",
        "threat",
        "someone following me"
    ]

    text = text.lower()

    for word in distress_words:
        if word in text:
            return True

    return False


# -------------------------
# HOME PAGE
# -------------------------
@app.route("/")
def home():
    return render_template("index.html")


# -------------------------
# REGISTER
# -------------------------
@app.route("/register", methods=["GET","POST"])
def register():

    if request.method == "POST":

        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]

        cursor.execute(
            "INSERT INTO users (name,email,password) VALUES (%s,%s,%s)",
            (name,email,password)
        )

        db.commit()

        return redirect("/login")

    return render_template("register.html")


# -------------------------
# LOGIN
# -------------------------
@app.route("/login", methods=["GET","POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        cursor.execute(
            "SELECT * FROM users WHERE email=%s AND password=%s",
            (email,password)
        )

        user = cursor.fetchone()

        if user:
            session["user_id"] = user[0]
            return redirect("/dashboard")

        else:
            return "Invalid Login"

    return render_template("login.html")


# -------------------------
# DASHBOARD
# -------------------------
@app.route("/dashboard", methods=["GET","POST"])
def dashboard():

    if "user_id" not in session:
        return redirect("/login")

    if request.method == "POST":

        message = request.form["message"]
        location = request.form["location"]

        if detect_distress(message):

            # Save alert in DB
            cursor.execute(
                "INSERT INTO alerts (user_id,location,message) VALUES (%s,%s,%s)",
                (session["user_id"],location,message)
            )

            db.commit()

            # GET CONTACT EMAILS
            cursor.execute(
                "SELECT contact_email FROM contacts WHERE user_id=%s",
                (session["user_id"],)
            )

            contacts = cursor.fetchall()

            # SEND EMAIL TO ALL CONTACTS
            for contact in contacts:

                msg = Message(
                    subject="🚨 SHIELDHER EMERGENCY ALERT",
                    sender=app.config['MAIL_USERNAME'],
                    recipients=[contact[0]]
                )

                msg.body = f"""
Emergency Alert!

A ShieldHer user may be in danger.

Message:
{message}

Location:
{location}

Please contact them immediately.
"""

                mail.send(msg)

            return "<h2>🚨 Emergency Alert Sent to Contacts!</h2><a href='/dashboard'>Back</a>"

        else:
            return "<h3>No distress detected</h3><a href='/dashboard'>Back</a>"

    # LOAD CONTACTS
    cursor.execute(
        "SELECT contact_name,contact_email FROM contacts WHERE user_id=%s",
        (session["user_id"],)
    )

    contacts = cursor.fetchall()

    # LOAD ALERT HISTORY
    cursor.execute(
        "SELECT message,timestamp FROM alerts WHERE user_id=%s",
        (session["user_id"],)
    )

    alerts = cursor.fetchall()

    return render_template(
        "dashboard.html",
        contacts=contacts,
        alerts=alerts
    )


# -------------------------
# ADD CONTACT
# -------------------------
@app.route("/add_contact", methods=["POST"])
def add_contact():

    if "user_id" not in session:
        return redirect("/login")

    name = request.form["name"]
    email = request.form["email"]

    cursor.execute(
        "INSERT INTO contacts (user_id,contact_name,contact_email) VALUES (%s,%s,%s)",
        (session["user_id"],name,email)
    )

    db.commit()

    return redirect("/dashboard")


# -------------------------
# LOGOUT
# -------------------------
@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


# -------------------------
# RUN SERVER
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)