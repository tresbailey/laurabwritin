import boto3
import httpx
import json
import logging
import os
import sys
from botocore.exceptions import ClientError
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Form, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jinja2 import Environment, PackageLoader, select_autoescape
from mangum import Mangum

'''
logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        )

# Create a logger instance
logger = logging.getLogger('mangum')
'''

logging.basicConfig()
logger = logging.getLogger(__name__)
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
logger.setLevel(LOG_LEVEL)

app = FastAPI()

env = Environment(loader=PackageLoader("app"), autoescape=select_autoescape())
RECIPIENT = os.getenv('target_email', 'tres.bailey@gmail.com')

AWS_REGION = "us-east-1"

MAILERLITE_SUBSCRIPTION_GROUP = os.getenv('DEFAULT_SUBSCRIPTION_GROUP', '111019273383577238')
MAILERLITE_API_KEY = os.getenv("MAILERLITE_API_KEY")
MAILERLITE_SUBSCRIBERS_URL = "https://connect.mailerlite.com/api/subscribers"

CONTACT_AUDIT_TABLE = os.getenv('CONTACT_AUDIT_TABLE', 'laurarbailey-contact-emailer-audit')
ENGAGEMENT_AUDIT_TABLE = os.getenv('ENGAGEMENT_AUDIT_TABLE', 'laurarbailey-engagement-emailer-audit')

# @app.exception_handler(RequestValidationError)
async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
        ):
    logger.info(request.form())
    logger.warning(
            "422 Validation Error",
            extra={
                "path": request.url.path,
                "method": request.method,
                "errors": exc.errors(),
                "body": exc.body,
                },
            )

    return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                },
            )

def save_message_ddb(table_name: str, item: dict,
        ip_address: str | None = None,
        user_agent: str| None = None, 
        ttl_days: int = 30):
    logger.debug('Started save_message_ddb')
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    table = dynamodb.Table(table_name)
    item["created_at"] = datetime.now(timezone.utc).isoformat()
    if ip_address:
        item["ip_address"] = ip_address

    if user_agent:
        item["user_agent"] = user_agent

    item["expires_at"] = (datetime.now() + timedelta(days=ttl_days)).isoformat()

    try:
        table.put_item(Item=item)
    except Exception as e:
        logger.exception(f"An exception occurred during write to the Dynamo table {table_name}", exc_info=True)
    logger.debug('Completed save_message_ddb')
    return item


def save_contact_message(
        ses_message_id: str,
        reply_email: str,
        reply_name: str,
        message: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        ):
    logger.debug('Started save_contact_message')

    item = {
            "ses_message_id": ses_message_id,
            "reply_email": reply_email,
            "reply_name": reply_name,
            "message": message,
            }

    logger.debug('Completed save_contact_message')
    return save_message_ddb(CONTACT_AUDIT_TABLE, item, ip_address, user_agent, 30)


def save_engagement_message(
        ses_message_id: str,
        reply_email: str,
        reply_name: str,
        location: str,
        attendance: int,
        budget: int,
        church_name: str,
        engagement_date: str,
        session_count: int,
        description: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        ):

    logger.debug('Started save_engagement_message')
    item = {
            "ses_message_id": ses_message_id,
            "reply_email": reply_email,
            "reply_name": reply_name,
            "description": description,
            "location": location,
            "attendance": attendance,
            "budget": budget,
            "church_name": church_name,
            "engagement_date": engagement_date,
            "session_count": session_count,
            }

    logger.debug('Completed save_engagement_message')
    return save_message_ddb(ENGAGEMENT_AUDIT_TABLE, item, ip_address, user_agent, 90)




def send_email(html_body, text_body, reply_email, reply_name, email_target, subject):
    # This address must be verified with Amazon SES.
    SENDER = f'{reply_name} <{reply_email}>'

    # The subject line for the email.
    SUBJECT = f'Message from Laura R Bailey website {subject}'

    # The character encoding for the email.
    CHARSET = "UTF-8"
    # Create SES client (edited)
    ses = boto3.client('ses', region_name=AWS_REGION)
    logger.info(f'Sending the email to destination {email_target}')
    try:
        #Provide the contents of the email.
        response = ses.send_email(
                Destination={
                    'ToAddresses': [
                        email_target,
                        ],
                    },
                ReplyToAddresses=[reply_email],
                Message={
                    'Body': {
                        'Html': {
                            'Charset': CHARSET,
                            'Data': html_body,
                            },
                        'Text': {
                            'Charset': CHARSET,
                            'Data': text_body,
                            },
                        },
                    'Subject': {
                        'Charset': CHARSET,
                        'Data': subject,
                        },
                    },
                Source=SENDER
                )
    # Display an error if something goes wrong. 
    except ClientError as e:
        print(f'Failed to send email to {reply_email}')
        print(e.response['Error']['Message'])
    else:
        print(f"Email sent with message-id: {response['MessageId']} from email address {reply_email}")
    logger.debug('Completed send_email')
    return response


def get_client_ip(request: Request) -> str | None:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First IP is the original client
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@app.post("/subscription")
async def create_subscription(
        subscriber_email: str = Form(...),
        subscription_group: str = Form(MAILERLITE_SUBSCRIPTION_GROUP ),
        ):

    logger.info('Attempting to add {subscriber_email} to Maillite group {subscription_group}')
    if not MAILERLITE_API_KEY:
        raise HTTPException(status_code=500, detail="MailerLite API key not configured")

    headers = {
            "Authorization": f"Bearer {MAILERLITE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            }

    body = {
            "email": subscriber_email,
            "status": "active"
            }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
                MAILERLITE_SUBSCRIBERS_URL,
                json=body,
                headers=headers
                )

    if response.status_code not in (200, 201):
        raise HTTPException(
                status_code=response.status_code,
                detail=response.json()
                )

    return {
            "success": True,
            "subscriber": response.json()
            }

@app.post("/contact")
async def contact_form(
        request: Request,
        reply_to: str = Form(...),
        from_name: str = Form(...),
        message: str = Form(max_length=1000),
        from_name_secret: str = Form(...),
        ):
    logger.info(f'Attempting contact email from {reply_to}')
    user_agent = request.headers.get("user-agent")
    ip_address = get_client_ip(request)


    if from_name_secret != 'default':
        logger.info(f'Received a value in honeypot field [[{from_name_secret}]] from {ip_address} on {user_agent} - Aborting')
        return {
                'statusCode': 403,
                'body': json.dumps(f'Sorry, Honey.')
                }

    template_vars =  {
            "reply_email": reply_to,
            "reply_name": from_name,
            "message": message,
            }

    logger.debug(f'Sending contact email with data {template_vars}')
    ses_response = send_email(env.get_template("contact.html").render(**template_vars),
               env.get_template("contact.txt").render(**template_vars),
               reply_to,
               from_name,
               RECIPIENT,
               f'Message from a user on the Laura R Bailey website'
               )

    logger.info('Successfully sent email')

    ses_message_id = ses_response["MessageId"]

    logger.debug('Saving the message to the audit table')
    save_contact_message(
            ses_message_id=ses_message_id,
            reply_email=reply_to,
            reply_name=from_name,
            message=message,
            ip_address=ip_address,
            user_agent=user_agent
            )
    logger.debug('Saved message to DynamoDB')
    logger.info('Returning a successful response')
    return {
        'statusCode': 200,
        'body': json.dumps(f'Sent email from {reply_to}')
        }



@app.post('/engagement')
async def engagement_form(
        request: Request,
        reply_to: str = Form(...),
        from_name: str = Form(...),
        location: str = Form(...),
        attendance: int = Form(...),
        budget: int = Form(...),
        church_name: str = Form(...),
        engagement_date: str = Form(...),
        session_count: int = Form(...),
        description: str = Form(max_length=1000),
        from_name_secret: str = Form(...),
        ):

    logger.info(f'Attempting engagement email from {reply_to}')
    user_agent = request.headers.get("user-agent")
    ip_address = get_client_ip(request)

    if from_name_secret != 'default':
        logger.info(f'Received a value in honeypot field [[{from_name_secret}]] from {ip_address} on {user_agent} - Aborting')
        return {
                'statusCode': 403,
                'body': json.dumps(f'Sorry, Honey.')
                }
    template_vars = {
            "reply_email": reply_to,
            "reply_name": from_name,
            "description": description,
            "location": location,
            "attendance": attendance,
            "budget": budget,
            "church_name": church_name,
            "engagement_date": engagement_date,
            "session_count": session_count
            }

    logger.debug(f'Sending engagement email with data {template_vars}')

    ses_response = send_email(env.get_template("engagement.html").render(**template_vars),
               env.get_template("engagement.txt").render(**template_vars),
               reply_to,
               from_name,
               RECIPIENT,
               f'Message from a user on the Laura R Bailey website')

    logger.info('Successfully sent email')
    ses_message_id = ses_response["MessageId"]

    save_engagement_message(
            ses_message_id=ses_message_id,
            ip_address=ip_address,
            user_agent=user_agent,
            **template_vars
            )
    return {
            'statusCode': 200,
            'body': json.dumps(f'Sent email from {reply_to}')
            }



# Lambda entrypoint
lambda_handler = Mangum(app)

