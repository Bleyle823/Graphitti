import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { SupabaseIcon } from "./icon";

const kelpOutputFields = [
  { field: "rows", description: "Matching table rows" },
  { field: "count", description: "Number of rows returned" },
  { field: "latest", description: "First row when limit >= 1" },
  { field: "has_match", description: "True when at least one row matches" },
  { field: "should_alert", description: "Kelp: latest.should_alert" },
  { field: "deviation_bps", description: "Kelp: latest.deviation_bps" },
  {
    field: "bridge_deviation_bps",
    description: "Kelp: latest.bridge_deviation_bps",
  },
  { field: "block_number", description: "Kelp: latest.block_number" },
  { field: "mainnet_supply", description: "Kelp: latest.mainnet_supply" },
  { field: "arb_supply", description: "Kelp: latest.arb_supply" },
  { field: "total_backing", description: "Kelp: latest.total_backing" },
  { field: "excess", description: "Kelp: latest.excess" },
  {
    field: "effective_supply",
    description: "Kelp: latest.effective_supply",
  },
];

const supabasePlugin: IntegrationPlugin = {
  type: "supabase",
  label: "Supabase",
  description: "Query tables via Supabase PostgREST REST API",
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
        "Publishable anon key for read-only access via RLS. Do not use the service role key in workflows.",
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
      slug: "query-table",
      label: "Query table",
      description:
        "Read rows from a Supabase table through PostgREST (select, order, filter, limit)",
      category: "Supabase",
      stepFunction: "queryTableStep",
      stepImportPath: "query-table",
      outputFields: kelpOutputFields,
      configFields: [
        {
          key: "table",
          label: "Table",
          type: "template-input",
          placeholder: "backing_snapshots",
          example: "backing_snapshots",
          required: true,
        },
        {
          key: "select",
          label: "Select columns",
          type: "template-input",
          placeholder: "* or block_number,should_alert",
          defaultValue: "*",
        },
        {
          key: "orderBy",
          label: "Order by",
          type: "template-input",
          placeholder: "block_number",
          defaultValue: "block_number",
        },
        {
          key: "orderDirection",
          label: "Order direction",
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
          placeholder: "1",
          defaultValue: "1",
          min: 1,
          max: 1000,
        },
        {
          key: "filters",
          label: "PostgREST filters",
          type: "template-input",
          placeholder: "should_alert=eq.true",
          example: "should_alert=eq.true",
        },
        {
          key: "schema",
          label: "Schema profile",
          type: "template-input",
          placeholder: "arbitrum (optional; default public)",
        },
      ],
    },
  ],
};

registerIntegration(supabasePlugin);

export default supabasePlugin;
