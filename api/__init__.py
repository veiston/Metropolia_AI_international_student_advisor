# Expose the api to vercel. (I dunno)
from fastapi import FastAPI

app = FastAPI() 

@app.get('/api')
def read_root():
    return {'status': 'success'}
