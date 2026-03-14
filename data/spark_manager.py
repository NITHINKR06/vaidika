# data/spark_manager.py
import os, json
from dotenv import load_dotenv
load_dotenv()
DELTA_PATH = os.getenv('DELTA_LAKE_PATH', './data/delta')

def get_spark():
    from pyspark.sql import SparkSession
    return (SparkSession.builder.appName('VaidikaAI')
        .config('spark.jars.packages', 'io.delta:delta-core_2.12:2.4.0')
        .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
        .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog')
        .config('spark.sql.shuffle.partitions', '2')
        .getOrCreate())

def _flatten(v):
    return json.dumps(v) if isinstance(v, (list, dict)) else str(v) if v is not None else ''

def save_consultation_to_delta(record: dict):
    from pyspark.sql import Row
    spark = get_spark()
    flat = {k: _flatten(v) for k, v in record.items()}
    spark.createDataFrame([Row(**flat)]).write.format('delta').mode('append').save(f'{DELTA_PATH}/consultations')
    print(f'✅ Saved to Delta Lake')

def read_all_consultations():
    return get_spark().read.format('delta').load(f'{DELTA_PATH}/consultations')

def get_patient_history(patient_id: str):
    df = read_all_consultations()
    return df.filter(df.patient_id == patient_id)

if __name__ == '__main__':
    save_consultation_to_delta({'patient_id':'TEST','symptoms':'[]','diagnosis':'test','prescriptions':'[]','lab_tests':'[]','severity':'low','route_to':'[]','followup':'','clinical_notes':'','consultation_id':'T1','created_at':'2025-01-01'})
    print('✅ Delta Lake OK')
