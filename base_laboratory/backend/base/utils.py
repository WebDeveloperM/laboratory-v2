import pandas as pd
from .models import *


def import_computers_from_excel(file_path):
    df = pd.read_excel(file_path)

    for _, row in df.iterrows():

        warehouse_manager, _ = WarehouseManager.objects.get_or_create(
            name=row["Зав. склад"]
        )
        type_compyuter, _ = TypeCompyuter.objects.get_or_create(
            name=row["Тип орг.техники"]
        )
        motherboard, _ = Motherboard.objects.get_or_create(
            name=row["Производитель МП"]
        )
        motherboard_model, _ = MotherboardModel.objects.get_or_create(
            name=row["Модель МП"]
        )
        cpu, _ = CPU.objects.get_or_create(
            name=row["Процессор"]
        )
        generation, _ = Generation.objects.get_or_create(
            name=row["Поколение"]
        )

        frequency, _ = Frequency.objects.get_or_create(
            name=row["Частота"]
        )

        hdd, _ = HDD.objects.get_or_create(
            name=row["Диск HDD"]
        )

        ssd, _ = SSD.objects.get_or_create(
            name=row["Диск SSD"]
        )
        disk_type, _ = DiskType.objects.get_or_create(
            name=row["Тип SSD"]
        )
        ram_type, _ = RAMType.objects.get_or_create(
            name=row["Тип оперативки"]
        )
        ramsize, _ = RAMSize.objects.get_or_create(
            name=row["Размер"]
        )
        gpu, _ = GPU.objects.get_or_create(
            name=row["Видео карта"]
        )
        printer, _ = Printer.objects.get_or_create(
            name=row["Принтер"]
        )


