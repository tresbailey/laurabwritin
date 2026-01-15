FROM public.ecr.aws/lambda/python:3.13

WORKDIR /var/task

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
 && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Configure Poetry for Lambda
RUN poetry config virtualenvs.create false \
 && poetry install --only main --no-interaction --no-ansi

# Copy application code
COPY app ./app

# Lambda handler
CMD ["app.handler.lambda_handler"]

