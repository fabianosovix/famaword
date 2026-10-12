import { getDb } from '../db.js';

export function resolveArticleRelations(categoryId, editorId = 'random') {
  const db = getDb();
  const fail = (message) => {
    const error = new Error(message);
    error.status = 400;
    throw error;
  };
  if (!db.prepare('SELECT 1 FROM categories LIMIT 1').get() || !db.prepare('SELECT 1 FROM editors LIMIT 1').get()) {
    fail('Cadastre pelo menos uma categoria e um editor antes de criar artigos.');
  }
  if (!categoryId || !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId)) {
    fail('Selecione uma categoria cadastrada.');
  }
  const editor = !editorId || editorId === 'random'
    ? db.prepare('SELECT id FROM editors ORDER BY RANDOM() LIMIT 1').get()
    : db.prepare('SELECT id FROM editors WHERE id = ?').get(editorId);
  if (!editor) fail('Selecione um editor cadastrado.');
  return { category_id: categoryId, editor_id: editor.id };
}