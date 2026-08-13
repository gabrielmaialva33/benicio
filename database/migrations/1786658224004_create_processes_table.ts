import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'processes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tenant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('RESTRICT')
      table.integer('folder_id').unsigned().notNullable()

      // CNJ is stored without punctuation. Older cases may keep their original
      // number alongside the CNJ, as required by the CNJ numbering rules.
      table.string('cnj_number', 20).nullable()
      table.string('legacy_number', 80).nullable()
      table.string('internal_code', 80).nullable()

      table.string('status', 20).notNullable().defaultTo('active')
      table.string('instance', 20).nullable()
      table.string('phase', 30).nullable()
      table.string('distribution_type', 20).nullable()
      // NULL means the source did not tell us whether the case is electronic.
      table.boolean('electronic').nullable()
      table.boolean('is_primary').notNullable().defaultTo(false)
      table.string('nature', 120).nullable()
      table.string('action_type', 160).nullable()

      table.string('tribunal', 160).nullable()
      table.string('judicial_body', 160).nullable()
      table.string('district', 160).nullable()
      table.string('forum', 160).nullable()
      table.string('court_division', 160).nullable()
      table.string('judge', 160).nullable()

      table.decimal('case_value', 18, 2).nullable()
      table.decimal('conviction_value', 18, 2).nullable()
      table.decimal('costs', 18, 2).nullable()
      table.decimal('fees', 18, 2).nullable()

      // These are civil dates, not instants. Using DATE avoids timezone shifts.
      table.date('distribution_date').nullable()
      table.date('citation_date').nullable()
      table.date('entry_date').nullable()

      table.text('observation').nullable()
      table.text('object_detail').nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['tenant_id', 'id'], 'processes_tenant_id_id_unique')
      table
        .foreign(['tenant_id', 'folder_id'], 'processes_tenant_folder_foreign')
        .references(['tenant_id', 'id'])
        .inTable('folders')
        .onDelete('RESTRICT')
      table.index(['tenant_id', 'folder_id'], 'processes_tenant_folder_index')
      table.index(['tenant_id', 'status', 'instance'], 'processes_tenant_status_instance_index')
      table.index(['tenant_id', 'created_at'], 'processes_tenant_created_at_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_identifier_check
        CHECK (
          cnj_number IS NOT NULL
          OR NULLIF(BTRIM(legacy_number), '') IS NOT NULL
          OR NULLIF(BTRIM(internal_code), '') IS NOT NULL
        )
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_cnj_number_check
        CHECK (
          cnj_number IS NULL
          OR (
            cnj_number ~ '^[0-9]{13}[1-9][0-9]{6}$'
            AND MOD(
              (
                SUBSTRING(cnj_number FROM 1 FOR 7)
                || SUBSTRING(cnj_number FROM 10 FOR 11)
                || SUBSTRING(cnj_number FROM 8 FOR 2)
              )::numeric,
              97
            ) = 1
          )
        )
      `)

      await db.rawQuery(`
        ALTER TABLE processes
          ADD COLUMN cnj_year smallint
            GENERATED ALWAYS AS (SUBSTRING(cnj_number FROM 10 FOR 4)::smallint) STORED,
          ADD COLUMN cnj_segment char(1)
            GENERATED ALWAYS AS (SUBSTRING(cnj_number FROM 14 FOR 1)) STORED,
          ADD COLUMN cnj_tribunal_code char(2)
            GENERATED ALWAYS AS (SUBSTRING(cnj_number FROM 15 FOR 2)) STORED,
          ADD COLUMN cnj_origin_code char(4)
            GENERATED ALWAYS AS (SUBSTRING(cnj_number FROM 17 FOR 4)) STORED
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_status_check
        CHECK (status IN ('active', 'suspended', 'archived', 'closed'))
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_instance_check
        CHECK (instance IS NULL OR instance IN ('first', 'second', 'superior'))
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_phase_check
        CHECK (
          phase IS NULL
          OR phase IN ('knowledge', 'execution', 'appeal', 'sentence_compliance')
        )
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_distribution_type_check
        CHECK (
          distribution_type IS NULL
          OR distribution_type IN ('lottery', 'dependency', 'prevention')
        )
      `)

      await db.rawQuery(`
        ALTER TABLE processes
        ADD CONSTRAINT processes_non_negative_amounts_check
        CHECK (
          (case_value IS NULL OR case_value >= 0)
          AND (conviction_value IS NULL OR conviction_value >= 0)
          AND (costs IS NULL OR costs >= 0)
          AND (fees IS NULL OR fees >= 0)
        )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX processes_tenant_cnj_active_unique
        ON processes (tenant_id, cnj_number)
        WHERE deleted_at IS NULL AND cnj_number IS NOT NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX processes_tenant_folder_primary_unique
        ON processes (tenant_id, folder_id)
        WHERE deleted_at IS NULL AND is_primary
      `)

      await db.rawQuery(`
        CREATE INDEX processes_tenant_cnj_parts_index
        ON processes (tenant_id, cnj_segment, cnj_tribunal_code, cnj_year)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
