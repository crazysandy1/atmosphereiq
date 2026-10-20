FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY atmosphereiq_api ./atmosphereiq_api
EXPOSE 8000
CMD ["uvicorn", "atmosphereiq_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
