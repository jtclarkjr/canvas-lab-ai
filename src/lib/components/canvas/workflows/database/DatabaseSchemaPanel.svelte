<script lang="ts">
  import { Plus, Table2, Trash2 } from 'lucide-svelte'
  import {
    createDatabaseColumn,
    createDatabaseTable
  } from '#lib/workflows/database/definition.js'
  import type {
    DatabaseColumn,
    DatabaseFlowDefinition,
    DatabaseTable
  } from '#lib/workflows/database/schema.js'

  let { definition, canModify, onDefinitionChange } = $props<{
    definition: DatabaseFlowDefinition
    canModify: boolean
    onDefinitionChange: (
      definition: DatabaseFlowDefinition
    ) => void | Promise<void>
  }>()

  function patchDefinition(
    updater: (definition: DatabaseFlowDefinition) => DatabaseFlowDefinition
  ) {
    if (!canModify) return
    void onDefinitionChange(updater(definition))
  }

  function updateTable(
    tableId: string,
    updater: (table: DatabaseTable) => DatabaseTable
  ) {
    patchDefinition((currentDefinition) => ({
      ...currentDefinition,
      tables: currentDefinition.tables.map((table) =>
        table.id === tableId ? updater(table) : table
      )
    }))
  }

  function addTable() {
    patchDefinition((currentDefinition) => ({
      ...currentDefinition,
      tables: [
        ...currentDefinition.tables,
        createDatabaseTable(currentDefinition)
      ]
    }))
  }

  function deleteTable(tableId: string) {
    patchDefinition((currentDefinition) => ({
      ...currentDefinition,
      tables: currentDefinition.tables.filter((table) => table.id !== tableId),
      relations: currentDefinition.relations.filter(
        (relation) =>
          relation.sourceTableId !== tableId &&
          relation.targetTableId !== tableId
      )
    }))
  }

  function addColumn(tableId: string) {
    updateTable(tableId, (table) => ({
      ...table,
      columns: [...table.columns, createDatabaseColumn(table)]
    }))
  }

  function updateColumn(
    tableId: string,
    columnId: string,
    updater: (column: DatabaseColumn) => DatabaseColumn
  ) {
    updateTable(tableId, (table) => ({
      ...table,
      columns: table.columns.map((column) =>
        column.id === columnId ? updater(column) : column
      )
    }))
  }

  function deleteColumn(tableId: string, columnId: string) {
    patchDefinition((currentDefinition) => ({
      ...currentDefinition,
      tables: currentDefinition.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: table.columns.filter((column) => column.id !== columnId)
            }
          : table
      ),
      relations: currentDefinition.relations.filter(
        (relation) =>
          !(
            (relation.sourceTableId === tableId &&
              relation.sourceColumnId === columnId) ||
            (relation.targetTableId === tableId &&
              relation.targetColumnId === columnId)
          )
      )
    }))
  }

  function deleteRelation(relationId: string) {
    patchDefinition((currentDefinition) => ({
      ...currentDefinition,
      relations: currentDefinition.relations.filter(
        (relation) => relation.id !== relationId
      )
    }))
  }

  function tableLabel(tableId: string) {
    const table = definition.tables.find(
      (entry: DatabaseTable) => entry.id === tableId
    )
    return table ? `${table.schema}.${table.name}` : tableId
  }

  function columnLabel(tableId: string, columnId: string) {
    return (
      definition.tables
        .find((entry: DatabaseTable) => entry.id === tableId)
        ?.columns.find((column: DatabaseColumn) => column.id === columnId)
        ?.name ?? columnId
    )
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
  <button
    type="button"
    class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    onclick={addTable}
    disabled={!canModify}
  >
    <Plus class="size-4" />
    Add table
  </button>

  <div class="grid gap-3">
    {#each definition.tables as table (table.id)}
      <section
        class="grid gap-2 rounded-md border border-border/70 bg-background/50 p-2"
      >
        <div class="flex items-center gap-2">
          <Table2 class="size-4 shrink-0 text-primary" />
          <input
            class="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium text-foreground"
            value={table.name}
            disabled={!canModify}
            aria-label="Table name"
            onchange={(event) =>
              updateTable(table.id, (current) => ({
                ...current,
                name: event.currentTarget.value.trim() || current.name
              }))}
          />
          <button
            type="button"
            class="size-7 rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            onclick={() => deleteTable(table.id)}
            disabled={!canModify}
            aria-label="Delete table"
            title="Delete table"
          >
            <Trash2 class="mx-auto size-3.5" />
          </button>
        </div>

        <input
          class="rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
          value={table.schema}
          disabled={!canModify}
          aria-label="Table schema"
          onchange={(event) =>
            updateTable(table.id, (current) => ({
              ...current,
              schema: event.currentTarget.value.trim() || current.schema
            }))}
        />

        <div class="grid gap-2">
          {#each table.columns as column (column.id)}
            <div
              class="grid grid-cols-[minmax(0,1fr)_minmax(72px,0.8fr)_auto] items-center gap-1 rounded border border-border/60 bg-card/70 p-1"
            >
              <input
                class="min-w-0 rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
                value={column.name}
                disabled={!canModify}
                aria-label="Column name"
                onchange={(event) =>
                  updateColumn(table.id, column.id, (current) => ({
                    ...current,
                    name: event.currentTarget.value.trim() || current.name
                  }))}
              />
              <input
                class="min-w-0 rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
                value={column.dataType}
                disabled={!canModify}
                aria-label="Column data type"
                onchange={(event) =>
                  updateColumn(table.id, column.id, (current) => ({
                    ...current,
                    dataType:
                      event.currentTarget.value.trim() || current.dataType
                  }))}
              />
              <button
                type="button"
                class="size-7 rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                onclick={() => deleteColumn(table.id, column.id)}
                disabled={!canModify}
                aria-label="Delete column"
                title="Delete column"
              >
                <Trash2 class="mx-auto size-3.5" />
              </button>
              <div
                class="col-span-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
              >
                <label class="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={column.primaryKey}
                    disabled={!canModify}
                    onchange={(event) =>
                      updateColumn(table.id, column.id, (current) => ({
                        ...current,
                        primaryKey: event.currentTarget.checked,
                        nullable: event.currentTarget.checked
                          ? false
                          : current.nullable,
                        unique: event.currentTarget.checked
                          ? true
                          : current.unique
                      }))}
                  />
                  PK
                </label>
                <label class="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!column.nullable}
                    disabled={!canModify || column.primaryKey}
                    onchange={(event) =>
                      updateColumn(table.id, column.id, (current) => ({
                        ...current,
                        nullable: !event.currentTarget.checked
                      }))}
                  />
                  NN
                </label>
                <label class="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={column.unique}
                    disabled={!canModify || column.primaryKey}
                    onchange={(event) =>
                      updateColumn(table.id, column.id, (current) => ({
                        ...current,
                        unique: event.currentTarget.checked
                      }))}
                  />
                  UQ
                </label>
                <label class="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={column.identity}
                    disabled={!canModify}
                    onchange={(event) =>
                      updateColumn(table.id, column.id, (current) => ({
                        ...current,
                        identity: event.currentTarget.checked
                      }))}
                  />
                  Identity
                </label>
              </div>
            </div>
          {/each}
        </div>

        <button
          type="button"
          class="flex h-8 items-center justify-center gap-2 rounded-md border border-border/70 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          onclick={() => addColumn(table.id)}
          disabled={!canModify}
        >
          <Plus class="size-3.5" />
          Add column
        </button>
      </section>
    {:else}
      <div
        class="flex h-24 items-center justify-center rounded-md border border-border/70 text-xs text-muted-foreground"
      >
        No tables.
      </div>
    {/each}
  </div>

  {#if definition.relations.length}
    <section class="grid gap-2 rounded-md border border-border/70 p-2">
      <div class="text-xs font-semibold text-muted-foreground">Relations</div>
      {#each definition.relations as relation (relation.id)}
        <div class="flex items-center gap-2 text-xs">
          <span class="min-w-0 flex-1 truncate text-foreground">
            {tableLabel(relation.sourceTableId)}.{columnLabel(
              relation.sourceTableId,
              relation.sourceColumnId
            )}
            ->
            {tableLabel(relation.targetTableId)}.{columnLabel(
              relation.targetTableId,
              relation.targetColumnId
            )}
          </span>
          <button
            type="button"
            class="size-7 rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            onclick={() => deleteRelation(relation.id)}
            disabled={!canModify}
            aria-label="Delete relation"
            title="Delete relation"
          >
            <Trash2 class="mx-auto size-3.5" />
          </button>
        </div>
      {/each}
    </section>
  {/if}
</div>
