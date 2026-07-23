import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import buscar


def post(sc, url, **kw):
    base = {
        "shortCode": sc,
        "url": url,
        "ownerUsername": "marca",
        "type": "Image",
        "caption": "legenda",
        "hashtags": [],
        "displayUrl": "http://img",
    }
    base.update(kw)
    return base


class TestNormaliza(unittest.TestCase):
    def test_remove_query_e_barra(self):
        self.assertEqual(
            buscar.normaliza_url("https://www.instagram.com/p/ABC/?igsh=x"),
            "https://www.instagram.com/p/ABC",
        )
        self.assertEqual(
            buscar.normaliza_url("https://www.instagram.com/p/ABC/"),
            "https://www.instagram.com/p/ABC",
        )


class TestUrlsPublicadas(unittest.TestCase):
    def test_coleta_urls_das_referencias(self):
        dados = {
            "cards": [
                {"referencias": [{"url": "https://www.instagram.com/p/AAA/"}]},
                {"referencias": []},
                {"referencias": [{"url": "https://www.instagram.com/reel/BBB/?x=1"}]},
            ]
        }
        self.assertEqual(
            buscar.urls_publicadas(dados),
            {"https://www.instagram.com/p/AAA", "https://www.instagram.com/reel/BBB"},
        )


class TestFiltrarNovos(unittest.TestCase):
    def test_descarta_vistos_publicados_e_sem_shortcode(self):
        posts = [
            post("AAA", "https://www.instagram.com/p/AAA/"),  # publicado
            post("BBB", "https://www.instagram.com/p/BBB/"),  # visto
            post("CCC", "https://www.instagram.com/p/CCC/"),  # novo
            post(None, "https://www.instagram.com/p/DDD/"),  # sem shortcode
        ]
        publicadas = {"https://www.instagram.com/p/AAA"}
        vistos = {"BBB"}
        novos = buscar.filtrar_novos(posts, vistos, publicadas)
        self.assertEqual([p["shortCode"] for p in novos], ["CCC"])


class TestMontarPendente(unittest.TestCase):
    def test_shape_e_handle(self):
        p = buscar.montar_pendente(
            post("CCC", "https://www.instagram.com/p/CCC/?igsh=z"),
            "agente/pendentes/CCC.jpg",
        )
        self.assertEqual(p["shortCode"], "CCC")
        self.assertEqual(p["url"], "https://www.instagram.com/p/CCC")
        self.assertEqual(p["handle"], "@marca")
        self.assertEqual(p["image"], "agente/pendentes/CCC.jpg")
        self.assertIn("scraped_at", p)


if __name__ == "__main__":
    unittest.main()
