#!/usr/bin/env python
import os
import django
import subprocess
import json
from pathlib import Path

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Directory to store temporary JSON files
TEMP_DIR = Path('migration_temp')
TEMP_DIR.mkdir(exist_ok=True)

# The order in which to migrate tables (based on dependencies)
# Start with auth, then move to contenttypes, etc.
MODELS_ORDER = [
    'auth.group',
    'auth.user',
    'contenttypes.contenttype',
    'auth.permission',
    'authtoken.token',
    'users.customtoken',
    'sessions.session',
    'base.department',
    'base.warehousemanager',
    'base.typecompyuter',
    'base.motherboard',
    'base.motherboardmodel',
    'base.cpu',
    'base.generation',
    'base.frequency',
    'base.hdd',
    'base.ssd',
    'base.ramsize',
    'base.gpu',
    'base.printer',
    'base.scaner',
    'base.typewebcamera',
    'base.modelwebcamera',
    'base.monitor',
    'base.disktype',
    'base.ramtype',
    'base.programlicense', 
    'base.program',
    'base.os',
    'base.mfo',
    'base.section',
    'base.compyuter',
    'base.historicalcompyuter',
    'base.computeragent',
    'admin.logentry',
]

# Temporary: change to SQLite database
print("Switching to SQLite database for data export...")
os.environ['DJANGO_DATABASE'] = 'sqlite'

# Function to dump data from SQLite
def dump_data(model, output_file):
    print(f"Dumping {model} to {output_file}...")
    command = f"python manage.py dumpdata {model} --database=default > {output_file}"
    return subprocess.run(command, shell=True)

# Dump all models to separate files
for model in MODELS_ORDER:
    output_file = TEMP_DIR / f"{model.replace('.', '_')}.json"
    dump_result = dump_data(model, output_file)
    if dump_result.returncode != 0:
        print(f"Warning: Failed to dump {model}")

# Switch to PostgreSQL database
print("Switching to PostgreSQL database for data import...")
os.environ['DJANGO_DATABASE'] = 'postgres'

# Function to load data into PostgreSQL
def load_data(input_file):
    model_name = input_file.stem.replace('_', '.')
    print(f"Loading {model_name} from {input_file}...")
    
    # Read the file content
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
            
        # If the file is empty or contains empty array, skip it
        if not data:
            print(f"Skipping empty file: {input_file}")
            return 0
        
        # Proceed with loading
        command = f"python manage.py loaddata {input_file}"
        result = subprocess.run(command, shell=True)
        return result.returncode
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {input_file}")
        return 1
    except Exception as e:
        print(f"Error loading {input_file}: {str(e)}")
        return 1

# Load all models in the correct order
for model in MODELS_ORDER:
    input_file = TEMP_DIR / f"{model.replace('.', '_')}.json"
    if input_file.exists():
        load_result = load_data(input_file)
        if load_result != 0:
            print(f"Warning: Failed to load {model}")
    else:
        print(f"Warning: No data file found for {model}")

print("Migration completed!") 