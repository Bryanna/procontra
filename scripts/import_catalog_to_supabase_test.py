import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("import_catalog_to_supabase.py")


def load_importer():
    spec = importlib.util.spec_from_file_location("catalog_db_importer", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CatalogSupabaseImporterTest(unittest.TestCase):
    def test_builds_product_rows_without_claiming_inventory(self):
        importer = load_importer()
        payload = {
            "metadata": {"sourceFile": "INV_RPT.xlsx", "sourceModifiedAt": "2026-08-19T16:45:59+00:00"},
            "products": [{"code": "000123", "name": "Producto Uno", "location": ""}],
        }

        rows = importer.build_product_rows(payload)

        self.assertEqual(rows, [{
            "f_codigo": "000123",
            "f_nombre": "Producto Uno",
            "f_activo": True,
            "f_version_catalogo": "INV_RPT.xlsx@2026-08-19T16:45:59+00:00",
        }])
        self.assertNotIn("location", rows[0])

    def test_upserts_in_idempotent_batches_by_product_code(self):
        importer = load_importer()
        requests = []

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b""

        def transport(request, timeout):
            requests.append((request, timeout))
            return Response()

        rows = [
            {"f_codigo": f"{number:06d}", "f_nombre": f"Producto {number}", "f_activo": True, "f_version_catalogo": "v1"}
            for number in range(3)
        ]
        report = importer.upsert_products(
            rows,
            "http://127.0.0.1:8000",
            "server-secret",
            batch_size=2,
            transport=transport,
        )

        self.assertEqual(report, {"products": 3, "batches": 2})
        self.assertEqual(len(requests), 2)
        request = requests[0][0]
        self.assertEqual(request.full_url, "http://127.0.0.1:8000/rest/v1/t_productos?on_conflict=f_idempresa,f_idsucursal,f_app,f_codigo")
        self.assertEqual(request.headers["Prefer"], "resolution=merge-duplicates,return=minimal")
        self.assertEqual(request.headers["Content-profile"], "api")
        self.assertEqual(json.loads(request.data), rows[:2])

    def test_requires_server_only_environment_variables(self):
        importer = load_importer()
        with self.assertRaisesRegex(ValueError, "SUPABASE_URL"):
            importer.load_environment(Path("/does/not/exist"), {})


if __name__ == "__main__":
    unittest.main()
