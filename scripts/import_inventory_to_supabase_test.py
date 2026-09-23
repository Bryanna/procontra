import importlib.util
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from openpyxl import Workbook


SCRIPT = Path(__file__).with_name("import_inventory_to_supabase.py")


def load_importer():
    spec = importlib.util.spec_from_file_location("inventory_db_importer", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HEADERS = [
    "CODIGO", "PRODUCTO", "SUCURSAL", "EXISTENCIA", "INVENTARIO_MINIMO",
    "LOTE", "VENCIMIENTO", "COSTO", "PRECIO", "ACTUALIZADO_EN",
]


class InventorySupabaseImporterTest(unittest.TestCase):
    def test_reads_template_rows_preserving_codes_and_dates(self):
        importer = load_importer()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "inventory.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Carga_Inventario"
            sheet.append(HEADERS)
            sheet.append([
                "004378", "CLODIZOL", "70", 12, 4, "L-01",
                date(2027, 6, 30), 500.25, 750.10,
                "2026-08-27T22:30:00+00:00",
            ])
            workbook.save(path)

            rows = importer.read_inventory_rows(path)

        self.assertEqual(rows[0]["CODIGO"], "004378")
        self.assertEqual(rows[0]["SUCURSAL"], "70")
        self.assertEqual(rows[0]["VENCIMIENTO"], "2027-06-30")
        self.assertTrue(rows[0]["ACTUALIZADO_EN"].startswith("2026-08-27T22:30:00"))

    def test_resolves_foreign_keys_without_inventing_missing_records(self):
        importer = load_importer()
        row = {
            "CODIGO": "004378", "PRODUCTO": "CLODIZOL", "SUCURSAL": "70",
            "EXISTENCIA": 12, "INVENTARIO_MINIMO": 4, "LOTE": "L-01",
            "VENCIMIENTO": "2027-06-30", "COSTO": 500.25, "PRECIO": 750.10,
            "ACTUALIZADO_EN": "2026-08-27T22:30:00+00:00",
        }

        positions = importer.build_inventory_positions(
            [row], {"004378": "product-id"}, {"70": ("branch-id", 1)}, "inventory.xlsx",
        )

        self.assertEqual(positions, [{
            "f_uuid_producto": "product-id", "f_uuid_sucursal": "branch-id",
            "f_disponible": "12", "f_reservado": "0", "f_minimo_reorden": "4",
            "f_lote": "L-01", "f_fecha_vencimiento": "2027-06-30", "f_costo": "500.25",
            "f_precio": "750.1", "f_actualizado_en": "2026-08-27T22:30:00+00:00",
            "f_fuente": "inventory.xlsx", "f_idsucursal": 1,
        }])

        with self.assertRaisesRegex(ValueError, "Producto desconocido"):
            importer.build_inventory_positions([row], {}, {"70": ("branch-id", 1)}, "inventory.xlsx")
        with self.assertRaisesRegex(ValueError, "Sucursal desconocida"):
            importer.build_inventory_positions([row], {"004378": "product-id"}, {}, "inventory.xlsx")


if __name__ == "__main__":
    unittest.main()
