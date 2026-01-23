export function listTablesSql(schemas?: string[]) {
  const schemaFilter = schemas && schemas.length > 0
    ? `AND t.table_schema IN (${schemas.map(s => `'${s}'`).join(', ')})`
    : ''
  return `
    SELECT
      t.table_name,
      t.table_schema,
      obj_description((t.table_schema||'.'||t.table_name)::regclass, 'pg_class') as comment
    FROM information_schema.tables t
    WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
    ${schemaFilter}
    ORDER BY t.table_schema, t.table_name
  `
}
