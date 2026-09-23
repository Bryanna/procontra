import importlib.util
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook


SCRIPT = Path(__file__).with_name("import_inventory_catalog.py")


def load_importer():
    spec = importlib.util.spec_from_file_location("inventory_importer", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InventoryCatalogImporterTest(unittest.TestCase):
    def test_imports_catalog_preserving_codes_and_reporting_missing_stock_fields(self):
        importer = load_importer()
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source.xlsx"
            output = Path(folder) / "catalog.json"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Datos"
            sheet.append(["Inventario", None, None])
            sheet.append(["Completo Personalizado", None, None])
            sheet.append(["CODIGO", "PRODUCTO", "UBICACION"])
            sheet.append(["000123", "Producto Uno", ""])
            sheet.append(["000123", "Producto Uno", ""])
            sheet.append(["000124", "Producto Dos", "A1"])
            workbook.save(source)

            report = importer.import_catalog(source, output)

            self.assertEqual(report["sourceRows"], 3)
            self.assertEqual(report["catalogEntries"], 2)
            self.assertEqual(report["exactDuplicatesIgnored"], 1)
            self.assertEqual(report["missingLocation"], 1)
            self.assertEqual(report["missingOperationalFields"], [
                "SUCURSAL", "EXISTENCIA", "INVENTARIO_MINIMO", "LOTE",
                "VENCIMIENTO", "COSTO", "PRECIO", "ACTUALIZADO_EN",
            ])
            payload = importer.read_json(output)
            self.assertEqual(payload["products"][0]["code"], "000123")
            self.assertEqual(payload["products"][1]["location"], "A1")

    def test_rejects_a_sheet_without_the_required_catalog_headers(self):
        importer = load_importer()
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "invalid.xlsx"
            output = Path(folder) / "catalog.json"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Datos"
            sheet.append(["OTRO", "FORMATO"])
            workbook.save(source)

            with self.assertRaisesRegex(ValueError, "CODIGO.*PRODUCTO"):
                importer.import_catalog(source, output)


if __name__ == "__main__":
    unittest.main()
