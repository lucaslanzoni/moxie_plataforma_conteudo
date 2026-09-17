// assets/feedback.js — captura das avaliações da Gabriela (aprovado/rejeitado por
// referência) no localStorage + geração do pacote de export. Zero backend.
const KEY = 'moxie_feedback_v1';
const EMAIL_KEY = 'moxie_acesso';

function carregar() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function salvar(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* storage cheio/bloqueado */ }
}
function email() {
  try { return localStorage.getItem(EMAIL_KEY) || ''; } catch { return ''; }
}

// shortCode estável a partir da url do post (.../p/<sc>, /reel/<sc>...).
export function shortCodeOf(url) {
  const partes = (url || '').split('?')[0].replace(/\/+$/, '').split('/');
  return partes[partes.length - 1] || (url || '');
}

export function getEstado(sc) {
  return carregar()[sc]?.estado || null;
}

// alterna: clicar no mesmo estado desfaz (volta a neutro); senão define o novo.
export function alternar(sc, meta, estado) {
  const o = carregar();
  if (o[sc]?.estado === estado) {
    delete o[sc];
  } else {
    o[sc] = {
      estado,
      handle: meta.handle || '',
      url: meta.url || '',
      quando: new Date().toISOString(),
      email: email(),
    };
  }
  salvar(o);
  return o[sc]?.estado || null;
}

export function limparTudo() {
  salvar({});
}

export function resumo() {
  const o = carregar();
  let aprovadas = 0, rejeitadas = 0;
  for (const k in o) {
    if (o[k].estado === 'aprovado') aprovadas++;
    else if (o[k].estado === 'rejeitado') rejeitadas++;
  }
  return { aprovadas, rejeitadas, total: aprovadas + rejeitadas };
}

export function exportarPayload() {
  const o = carregar();
  const avaliacoes = Object.entries(o).map(([shortCode, v]) => ({ shortCode, ...v }));
  return {
    marca: 'Moxie',
    tipo: 'avaliacoes-painel',
    email: email(),
    gerado_em: new Date().toISOString(),
    resumo: resumo(),
    avaliacoes,
  };
}
