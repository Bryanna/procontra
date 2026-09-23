import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("bootstrap_local_admin.py")


def load_script():
    spec = importlib.util.spec_from_file_location("bootstrap_local_admin", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BootstrapLocalAdminTest(unittest.TestCase):
    def test_writes_credentials_with_owner_only_permissions(self):
        script = load_script()
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "credentials.txt"
            script.write_credentials(target, "admin@example.local", "secret-password")

            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            self.assertIn("admin@example.local", target.read_text())
            self.assertIn("secret-password", target.read_text())

    def test_safe_report_never_contains_the_password(self):
        script = load_script()
        report = script.safe_report("admin@example.local", Path("/root/credentials.txt"), "secret-password")

        self.assertEqual(report["email"], "admin@example.local")
        self.assertNotIn("secret-password", str(report))
        self.assertNotIn("password", report)


if __name__ == "__main__":
    unittest.main()
