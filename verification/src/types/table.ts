export interface Table {
  id: number
  name: string
  bytes: number
  comment: string
  dead_rows_estimate: number
  live_rows_estimate: number
  policies: any
  replica_identity: string
  rls_enabled: boolean
  rls_forced: boolean
  schema: string
  size: number
  columns: Column[]
  grants: Grant[]
  primary_keys: PrimaryKey[]
  relationships: Relationship[]
}

export interface Column {
  id: string
  name: string
  comment: string
  data_type: string
  default_value: any
  enums: any
  format: string
  identity_generator: any
  is_generated: boolean
  is_identity: boolean
  is_nullable: boolean
  is_unique: boolean
  is_updatable: boolean
  ordinal_position: number
  schema: string
  table: string
  table_id: number
}

export interface Grant {
  grantee: string
  grantor: string
  is_grantable: boolean
  privilege_type: string
  schema: string
  table_id: number
  table_name: string
  with_hierarchy: boolean
}

export interface PrimaryKey {
  name: string
  schema: string
  table_id: number
  table_name: string
}

export interface Relationship {
  constraint_name: string
  id: number
  source_column_name: string
  source_schema: string
  source_table_name: string
  target_column_name: string
  target_table_schema: string
  target_table_name: string
}

export interface TableDTO {
  name: string
  comment: string
  cols: ColumnDTO[]
}

export interface ColumnDTO {
  name: string
  type: string
  isIdentity: boolean
  isPrimaryKey: boolean
  isUnique: boolean
  isNullable?: boolean
  tableId?: number
  defaultValue?: any
  defaultValueFormat?: any
  comment?: any
}
