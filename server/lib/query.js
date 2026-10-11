// Translates MongoDB-style filter queries into SQL WHERE clauses.
// Supports: $in, $nin, $gt, $gte, $lt, $lte, $ne, $exists, $or, $regex (+ $options)

function escapeColumn(col) {
  // Only allow alphanumeric + underscore to prevent SQL injection via column names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) throw new Error(`Invalid column: ${col}`);
  return `"${col}"`;
}

function buildOperator(col, operators, params) {
  const parts = [];
  for (const [op, val] of Object.entries(operators)) {
    switch (op) {
      case '$in':
        if (!Array.isArray(val) || val.length === 0) {
          parts.push('0'); // IN () is invalid SQL
        } else {
          parts.push(`${col} IN (${val.map(() => '?').join(',')})`);
          params.push(...val);
        }
        break;
      case '$nin':
        if (!Array.isArray(val) || val.length === 0) break;
        parts.push(`${col} NOT IN (${val.map(() => '?').join(',')})`);
        params.push(...val);
        break;
      case '$gt':  parts.push(`${col} > ?`);  params.push(val); break;
      case '$gte': parts.push(`${col} >= ?`); params.push(val); break;
      case '$lt':  parts.push(`${col} < ?`);  params.push(val); break;
      case '$lte': parts.push(`${col} <= ?`); params.push(val); break;
      case '$ne':  parts.push(`${col} != ?`); params.push(val); break;
      case '$exists':
        if (val === false || val === 0) parts.push(`${col} IS NULL`);
        else parts.push(`${col} IS NOT NULL`);
        break;
      case '$regex': {
        const opts = operators.$options || '';
        const isInsensitive = opts.includes('i');
        // Convert JS regex to SQL LIKE (basic: prefix/contains)
        let pattern = String(val).replace(/^\^/, '').replace(/\$$/, '');
        const prefixAnchor = String(val).startsWith('^');
        const suffixAnchor = String(val).endsWith('$');
        if (prefixAnchor && suffixAnchor) {
          parts.push(`LOWER(${col}) = LOWER(?)`);
          params.push(pattern);
        } else if (prefixAnchor) {
          parts.push(isInsensitive ? `LOWER(${col}) LIKE LOWER(?) || '%'` : `${col} LIKE ? || '%'`);
          params.push(pattern);
        } else if (suffixAnchor) {
          parts.push(isInsensitive ? `LOWER(${col}) LIKE '%' || LOWER(?)` : `${col} LIKE '%' || ?`);
          params.push(pattern);
        } else {
          parts.push(isInsensitive ? `LOWER(${col}) LIKE '%' || LOWER(?) || '%'` : `${col} LIKE '%' || ? || '%'`);
          params.push(pattern);
        }
        break;
      }
      case '$options': break; // handled by $regex
      default: break;
    }
  }
  return parts;
}

export function buildWhere(query = {}) {
  const conditions = [];
  const params = [];

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(value)) continue;
      const subParts = [];
      for (const subQuery of value) {
        const [subSql, subParams] = buildWhere(subQuery);
        if (subSql) {
          subParts.push(subSql.replace(/^WHERE /, ''));
          params.push(...subParams);
        }
      }
      if (subParts.length) conditions.push(`(${subParts.join(' OR ')})`);
      continue;
    }

    const col = escapeColumn(key);

    if (value === null || value === undefined) {
      conditions.push(`${col} IS NULL`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const opParts = buildOperator(col, value, params);
      conditions.push(...opParts);
    } else {
      conditions.push(`${col} = ?`);
      params.push(value);
    }
  }

  if (conditions.length === 0) return { where: '', params };
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

// Parse sort string: '-created_date' → 'created_date DESC', 'title' → 'title ASC'
export function buildSort(sort) {
  if (!sort) return '';
  const parts = sort.split(',').map(s => s.trim()).filter(Boolean);
  const clauses = parts.map(p => {
    const desc = p.startsWith('-');
    const col = desc ? p.slice(1) : p;
    return `${escapeColumn(col)} ${desc ? 'DESC' : 'ASC'}`;
  });
  return clauses.length ? `ORDER BY ${clauses.join(', ')}` : '';
}