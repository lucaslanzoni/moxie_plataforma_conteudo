// assets/acesso.js — portão de acesso (soft gate). Checa o email contra acesso.json.
// AVISO: isto é um portão cosmético num site estático público — filtra a interface,
// não protege os arquivos (dados.json/prints seguem acessíveis por URL direta).
import { iniciar } from './app.js';

const CHAVE = 'moxie_acesso';
const el = (id) => document.getElementById(id);
const normal = (email) => (email || '').trim().toLowerCase();

async function listaEmails() {
  try {
    const r = await fetch('acesso.json', { cache: 'no-store' });
    const d = await r.json();
    return (d.emails || []).map(normal);
  } catch (e) {
    return null; // erro de rede
  }
}

async function temAcesso(email) {
  const lista = await listaEmails();
  if (lista === null) return null;
  return lista.includes(normal(email));
}

function entrar() {
  document.body.classList.add('autenticado');
  el('login-email')?.blur();
  iniciar();
}

async function tentar(valor) {
  const erro = el('login-erro');
  erro.textContent = '';
  const email = normal(valor);
  if (!email || !email.includes('@') || !email.includes('.')) {
    erro.textContent = 'Digita um email válido.';
    return;
  }
  const ok = await temAcesso(email);
  if (ok === null) {
    erro.textContent = 'Não deu pra checar a lista agora. Tenta de novo.';
    return;
  }
  if (ok) {
    localStorage.setItem(CHAVE, email);
    entrar();
  } else {
    erro.textContent = 'Esse email ainda não tem acesso. Fala com a Moxie.';
  }
}

function sair() {
  localStorage.removeItem(CHAVE);
  location.reload();
}

async function boot() {
  el('sair')?.addEventListener('click', sair);
  const salvo = localStorage.getItem(CHAVE);
  if (salvo) {
    const ok = await temAcesso(salvo);
    if (ok) { entrar(); return; }
    if (ok === false) localStorage.removeItem(CHAVE); // saiu da lista
  }
  const form = el('login-form');
  form.addEventListener('submit', (e) => { e.preventDefault(); tentar(el('login-email').value); });
  el('login-email').focus();
}

boot();
