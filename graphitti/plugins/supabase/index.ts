import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { SupabaseIcon } from "./icon";

const latestRowOutputFields = [
  { field: "rows", description: "Matching table rows" },
  { field: "count", description: "Number of rows returned" },
  {
    field: "latest",
    description:
      "Most recent row; each column is also available by name (e.g. status, block_number)",
  },
  { field: "has_match", description: "True when at least one row was returned" },
  {
    field: "alert_summary",
    description: "Optional summary when the row includes should_alert",
  },
];

const supabasePlugin: IntegrationPlugin = {
  type: "supabase",
  label: "Supabase",
  description:
    "Read live rows from Supabase with project URL + anon key — no SQL in the workflow",
  icon: SupabaseIcon,

  formFields: [
    {
      id: "url",
      label: "Project URL",
      type: "url",
      placeholder: "https://your-project.supabase.co",
      configKey: "url",
      envVar: "SUPABASE_URL",
      helpText: "From Supabase ",
      helpLink: {
        text: "Project Settings → API",
        url: "https://supabase.com/dashboard/project/_/settings/api",
      },
    },
    {
      id: "anonKey",
      label: "Anon key",
      type: "password",
      placeholder: "eyJ...",
      configKey: "anonKey",
      envVar: "SUPABASE_ANON_KEY",
      helpText:
        "Publishable anon key. Works with any table your RLS policy allows the anon role to read.",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testSupabase } = await import("./test");
      return testSupabase;
    },
  },

  actions: [
    {
      slug: "get-latest-row",
      label: "Get latest row",
      description:
        "Fetch the newest row from any Supabase table — set table name and sort column",
      category: "Supabase",
      stepFunction: "getLatestRowStep",
      stepImportPath: "get-latest-row",
      outputFields: latestRowOutputFields,
      configFields: [
        {
          key: "table",
          label: "Table",
          type: "template-input",
          placeholder: "your_table",
          example: "events",
          required: true,
        },
        {
          key: "orderBy",
          label: "Sort by column",
          type: "template-input",
          placeholder: "created_at",
          defaultValue: "created_at",
          required: true,
        },
        {
          key: "orderDirection",
          label: "Sort direction",
          type: "select",
          options: [
            { value: "desc", label: "Newest first" },
            { value: "asc", label: "Oldest first" },
          ],
          defaultValue: "desc",
        },
        {
          key: "select",
          label: "Columns",
          type: "template-input",
          placeholder: "* or id,status,created_at",
          defaultValue: "*",
        },
        {
          key: "schema",
          label: "Schema profile",
          type: "template-input",
          placeholder: "public (default) or arbitrum",
        },
      ],
    },
    {
      slug: "query-table",
      label: "Query table",
      description:
        "Read multiple rows with PostgREST filters, limits, and custom ordering",
      category: "Supabase",
      stepFunction: "queryTableStep",
      stepImportPath: "query-table",
      outputFields: latestRowOutputFields,
      configFields: [
        {
          key: "table",
          label: "Table",
          type: "template-input",
          placeholder: "your_table",
          example: "events",
          required: true,
        },
        {
          type: "group",
          label: "Query options",
          defaultExpanded: false,
          fields: [
            {
              key: "select",
              label: "Columns",
              type: "template-input",
              placeholder: "* or id,status",
              defaultValue: "*",
            },
            {
              key: "orderBy",
              label: "Sort by column",
              type: "template-input",
              placeholder: "created_at",
            },
            {
              key: "orderDirection",
              label: "Sort direction",
              type: "select",
              options: [
                { value: "desc", label: "Descending" },
                { value: "asc", label: "Ascending" },
              ],
              defaultValue: "desc",
            },
            {
              key: "limit",
              label: "Row limit",
              type: "number",
              placeholder: "10",
              defaultValue: "10",
              min: 1,
              max: 1000,
            },
            {
              key: "filters",
              label: "PostgREST filters",
              type: "template-input",
              placeholder: "status=eq.active",
              example: "status=eq.active",
            },
            {
              key: "schema",
              label: "Schema profile",
              type: "template-input",
              placeholder: "public (default) or arbitrum",
            },
          ],
        },
      ],
    },
  ],
};

registerIntegration(supabasePlugin);

export default supabasePlugin;
