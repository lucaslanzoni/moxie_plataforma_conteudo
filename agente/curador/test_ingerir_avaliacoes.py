import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ingerir_avaliacoes as m


def card(id_, referencias):
    return {"id": id_, "referencias": referencias}


def ref(url, print_="prints/x.jpg"):
    return {"handle": "@x", "url": url, "print": print_, "rede": "Instagram"}


def payload(avaliacoes):
    return {"marca": "Moxie", "tipo": "avaliacoes-painel", "avaliacoes": avaliacoes}


def aval(sc, estado):
    return {
        "shortCode": sc,
        "estado": estado,
        "handle": "@x",
        "url": f".../p/{sc}/",
        "quando": "t",
        "email": "g@x.com",
    }


class TestShortCodeDe(unittest.TestCase):
    def test_basico(self):
        self.assertEqual(
            m.short_code_de("https://www.instagram.com/p/ABC123/"), "ABC123"
        )

    def test_com_query_string(self):
        self.assertEqual(
            m.short_code_de("https://www.instagram.com/p/ABC123/?utm=x"), "ABC123"
        )

    def test_sem_barra_final(self):
        self.assertEqual(m.short_code_de("https://www.instagram.com/reel/XYZ"), "XYZ")


class TestIngerir(unittest.TestCase):
    def test_rejeitado_remove_referencia_e_marca_print(self):
        dados = {"cards": [card("c1", [ref("https://i.com/p/ABC/", "prints/abc.jpg")])]}
        log = []
        resultado, prints_removidos = m.ingerir(
            payload([aval("ABC", "rejeitado")]), dados, log
        )

        self.assertEqual(resultado["rejeitadas"], 1)
        self.assertEqual(dados["cards"][0]["referencias"], [])
        self.assertEqual(prints_removidos, ["prints/abc.jpg"])
        self.assertEqual(log[0]["resultado"], "removida_do_dados_json")

    def test_aprovado_nao_altera_dados(self):
        r = ref("https://i.com/p/ABC/")
        dados = {"cards": [card("c1", [r])]}
        log = []
        resultado, prints_removidos = m.ingerir(
            payload([aval("ABC", "aprovado")]), dados, log
        )

        self.assertEqual(resultado["aprovadas"], 1)
        self.assertEqual(dados["cards"][0]["referencias"], [r])
        self.assertEqual(prints_removidos, [])
        self.assertEqual(log[0]["resultado"], "sinal_de_qualidade_registrado")

    def test_short_code_nao_encontrado(self):
        dados = {"cards": [card("c1", [ref("https://i.com/p/OUTRO/")])]}
        log = []
        resultado, _ = m.ingerir(payload([aval("NAO-EXISTE", "aprovado")]), dados, log)

        self.assertEqual(resultado["nao_encontradas"], ["NAO-EXISTE"])
        self.assertEqual(log[0]["resultado"], "nao_encontrada")

    def test_idempotencia_nao_reprocessa(self):
        dados = {"cards": [card("c1", [ref("https://i.com/p/ABC/")])]}
        log = []
        m.ingerir(payload([aval("ABC", "rejeitado")]), dados, log)
        resultado2, prints_removidos2 = m.ingerir(
            payload([aval("ABC", "rejeitado")]), dados, log
        )

        self.assertEqual(resultado2["ja_processadas"], 1)
        self.assertEqual(resultado2["rejeitadas"], 0)
        self.assertEqual(prints_removidos2, [])
        self.assertEqual(len(log), 1)

    def test_duas_rejeicoes_no_mesmo_card(self):
        dados = {
            "cards": [
                card(
                    "c1",
                    [
                        ref("https://i.com/p/A/", "prints/a.jpg"),
                        ref("https://i.com/p/B/", "prints/b.jpg"),
                    ],
                )
            ]
        }
        log = []
        resultado, prints_removidos = m.ingerir(
            payload([aval("A", "rejeitado"), aval("B", "rejeitado")]), dados, log
        )

        self.assertEqual(resultado["rejeitadas"], 2)
        self.assertEqual(dados["cards"][0]["referencias"], [])
        self.assertEqual(set(prints_removidos), {"prints/a.jpg", "prints/b.jpg"})

    def test_tipo_invalido_levanta_erro(self):
        with self.assertRaises(ValueError):
            m.ingerir({"tipo": "outra-coisa", "avaliacoes": []}, {"cards": []}, [])


if __name__ == "__main__":
    unittest.main()
