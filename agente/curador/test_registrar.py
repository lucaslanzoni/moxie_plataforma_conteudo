import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import registrar


def dec(card, acao, card_final=None):
    return {
        "shortCode": card + acao,
        "proposta": {"card": card},
        "decisao": {"acao": acao, "card_final": card_final},
    }


class TestConcordancia(unittest.TestCase):
    def test_contagens_e_taxa(self):
        decisoes = [
            dec("a", "aprovado"),  # card mantido
            dec("a", "ajustado", "a"),  # ajustou tag, card mantido -> acerto
            dec("a", "ajustado", "b"),  # trocou o card -> discordância
            dec("c", "rejeitado"),  # fora do cálculo de card
        ]
        c = registrar.recomputar_concordancia(decisoes)
        self.assertEqual(c["total"], 4)
        self.assertEqual(c["aprovado_sem_ajuste"], 1)
        self.assertEqual(c["ajustado"], 2)
        self.assertEqual(c["rejeitado"], 1)
        self.assertAlmostEqual(c["taxa_concordancia_card"], round(2 / 3, 3))
        self.assertEqual(c["por_card"]["a"], {"propostas": 3, "card_aceito": 2})

    def test_vazio(self):
        c = registrar.recomputar_concordancia([])
        self.assertEqual(c["total"], 0)
        self.assertEqual(c["taxa_concordancia_card"], 0.0)


if __name__ == "__main__":
    unittest.main()
