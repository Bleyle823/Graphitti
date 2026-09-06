import type { IntegrationPlugin } from "@/plugins/registry";
import { registerIntegration } from "@/plugins/registry";
import { FantasyPremierLeagueIcon } from "./icon";

const LIST_OUTPUT = [
  { field: "success", description: "Whether the query succeeded" },
  { field: "count", description: "Number of rows returned in this page" },
  { field: "total", description: "Total matching rows on the server" },
  { field: "error", description: "Error message if the query failed" },
];

const fantasyPremierLeaguePlugin: IntegrationPlugin = {
  type: "fantasy-premier-league",
  egress: "user-destination",
  label: "Fantasy Premier League",
  description:
    "Query synced Fantasy Premier League data via the unofficial footy-api GraphQL API, plus public manager and league endpoints from FPL.",
  icon: FantasyPremierLeagueIcon,
  requiresCredentials: false,
  formFields: [
    {
      id: "graphqlUrl",
      label: "GraphQL URL (optional)",
      type: "url",
      placeholder: "https://fpl-api-6h0d.onrender.com/graphql",
      configKey: "graphqlUrl",
      envVar: "FPL_GRAPHQL_URL",
      helpText:
        "Unofficial FPL GraphQL endpoint. Leave blank to use the public hosted API. ",
      helpLink: {
        text: "flavnat/footy-api",
        url: "https://github.com/flavnat/footy-api",
      },
    },
  ],
  testConfig: {
    getTestFunction: async () => {
      const { testFantasyPremierLeague } = await import("./test");
      return testFantasyPremierLeague;
    },
  },
  actions: [
    {
      slug: "search-players",
      label: "Search players",
      description:
        "Filter players by name, team, position, status, form, or ownership using the unofficial FPL GraphQL API.",
      category: "Fantasy Premier League",
      stepFunction: "searchPlayersStep",
      stepImportPath: "search-players",
      outputFields: [
        ...LIST_OUTPUT,
        { field: "players", description: "Matching players with team and position" },
      ],
      configFields: [
        {
          key: "name",
          label: "Name",
          type: "template-input",
          placeholder: "Haaland or {{NodeName.playerName}}",
          example: "Haaland",
          helpTip: "Matches the FPL display name (web_name), case-insensitive.",
        },
        {
          key: "team",
          label: "Team",
          type: "template-input",
          placeholder: "ARS, Arsenal, or team id",
          example: "ARS",
        },
        {
          key: "position",
          label: "Position",
          type: "template-input",
          placeholder: "GKP, DEF, MID, or FWD",
          example: "MID",
        },
        {
          key: "status",
          label: "Status",
          type: "template-input",
          placeholder: "available, doubtful, injured, or suspended",
          example: "available",
        },
        {
          type: "group",
          label: "Ranking",
          defaultExpanded: false,
          fields: [
            {
              key: "minForm",
              label: "Min form",
              type: "template-input",
              placeholder: "5.0",
              example: "5",
            },
            {
              key: "maxOwnership",
              label: "Max ownership %",
              type: "template-input",
              placeholder: "5",
              example: "5",
              helpTip: "Useful for differentials: players owned by fewer than this percent of managers.",
            },
            {
              key: "orderBy",
              label: "Order by",
              type: "select",
              defaultValue: "total_points",
              options: [
                { value: "total_points", label: "Total points" },
                { value: "form", label: "Form" },
                { value: "now_cost", label: "Price" },
                { value: "selected_by_percent", label: "Ownership" },
                { value: "goals_scored", label: "Goals" },
                { value: "expected_goals", label: "Expected goals" },
                { value: "transfers_in_event", label: "Transfers in (GW)" },
                { value: "ict_index", label: "ICT index" },
              ],
            },
            {
              key: "direction",
              label: "Direction",
              type: "select",
              defaultValue: "DESC",
              options: [
                { value: "DESC", label: "High to low" },
                { value: "ASC", label: "Low to high" },
              ],
            },
            {
              key: "first",
              label: "Limit",
              type: "template-input",
              placeholder: "20",
              example: "20",
            },
          ],
        },
      ],
    },
    {
      slug: "get-player",
      label: "Get player",
      description: "Look up one player by FPL element id, including price, form, and underlying stats.",
      category: "Fantasy Premier League",
      stepFunction: "getPlayerStep",
      stepImportPath: "get-player",
      outputFields: [
        { field: "success", description: "Whether the lookup succeeded" },
        { field: "id", description: "Player id" },
        { field: "web_name", description: "FPL display name" },
        { field: "total_points", description: "Season points" },
        { field: "error", description: "Error message if the lookup failed" },
      ],
      configFields: [
        {
          key: "playerId",
          label: "Player ID",
          type: "template-input",
          placeholder: "351 or {{SearchPlayers.players.0.id}}",
          example: "351",
          required: true,
        },
      ],
    },
    {
      slug: "get-live-scores",
      label: "Get live scores",
      description:
        "Scores for matches that have started but are not fully finished, including bonus-pending games.",
      category: "Fantasy Premier League",
      stepFunction: "getLiveScoresStep",
      stepImportPath: "get-live-scores",
      outputFields: [
        ...LIST_OUTPUT,
        { field: "fixtures", description: "In-progress fixtures with scores and minutes" },
      ],
      configFields: [],
    },
    {
      slug: "get-fixtures",
      label: "Get fixtures",
      description: "Match schedule and results, optionally filtered by gameweek, team, or status.",
      category: "Fantasy Premier League",
      stepFunction: "getFixturesStep",
      stepImportPath: "get-fixtures",
      outputFields: [
        ...LIST_OUTPUT,
        { field: "fixtures", description: "Fixture list with teams, scores, and FDR" },
      ],
      configFields: [
        {
          key: "event",
          label: "Gameweek",
          type: "template-input",
          placeholder: "Gameweek number, or leave blank for all",
          example: "3",
        },
        {
          key: "team",
          label: "Team",
          type: "template-input",
          placeholder: "ARS, Arsenal, or team id",
          example: "ARS",
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          defaultValue: "all",
          options: [
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "upcoming", label: "Upcoming" },
            { value: "finished", label: "Finished" },
            { value: "bonus-pending", label: "Bonus pending" },
          ],
        },
        {
          key: "first",
          label: "Limit",
          type: "template-input",
          placeholder: "50",
          example: "50",
        },
      ],
    },
    {
      slug: "get-teams",
      label: "Get teams",
      description: "Premier League clubs with league position, form, and strength ratings.",
      category: "Fantasy Premier League",
      stepFunction: "getTeamsStep",
      stepImportPath: "get-teams",
      outputFields: [
        ...LIST_OUTPUT,
        { field: "teams", description: "Club list with strength and league stats" },
      ],
      configFields: [
        {
          key: "orderBy",
          label: "Order by",
          type: "select",
          defaultValue: "position",
          options: [
            { value: "position", label: "League position" },
            { value: "points", label: "League points" },
            { value: "strength", label: "Overall strength" },
            { value: "strength_defence_away", label: "Defence away (weak first if ASC)" },
            { value: "strength_attack_home", label: "Attack home" },
            { value: "name", label: "Name" },
          ],
        },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          defaultValue: "ASC",
          options: [
            { value: "ASC", label: "Low to high" },
            { value: "DESC", label: "High to low" },
          ],
        },
      ],
    },
    {
      slug: "get-events",
      label: "Get gameweeks",
      description:
        "Gameweek deadlines, average scores, and most selected or captained players.",
      category: "Fantasy Premier League",
      stepFunction: "getEventsStep",
      stepImportPath: "get-events",
      outputFields: [
        ...LIST_OUTPUT,
        { field: "events", description: "Gameweek records" },
      ],
      configFields: [
        {
          key: "filter",
          label: "Which gameweeks",
          type: "select",
          defaultValue: "current",
          options: [
            { value: "current", label: "Current" },
            { value: "next", label: "Next" },
            { value: "previous", label: "Previous" },
            { value: "all", label: "All" },
            { value: "id", label: "Specific ID" },
          ],
        },
        {
          key: "eventId",
          label: "Gameweek ID",
          type: "template-input",
          placeholder: "3",
          example: "3",
          showWhen: { field: "filter", equals: "id" },
        },
      ],
    },
    {
      slug: "get-event-winners",
      label: "Get event winners",
      description:
        "Top-performing FPL managers for a gameweek, ranked by points in the global league.",
      category: "Fantasy Premier League",
      stepFunction: "getEventWinnersStep",
      stepImportPath: "get-event-winners",
      outputFields: [
        ...LIST_OUTPUT,
        {
          field: "winners",
          description: "Rank, team name, points, and manager name",
        },
      ],
      configFields: [
        {
          key: "eventId",
          label: "Gameweek ID",
          type: "template-input",
          placeholder: "Leave blank for highest scores across all gameweeks",
          example: "3",
          helpTip:
            "Winners are synced once a gameweek is finalized. Future gameweeks have no rows yet.",
        },
        {
          key: "orderBy",
          label: "Order by",
          type: "select",
          defaultValue: "rank",
          options: [
            { value: "rank", label: "Rank (best first)" },
            { value: "points", label: "Points (highest first)" },
          ],
        },
        {
          key: "first",
          label: "Limit",
          type: "template-input",
          placeholder: "10",
          example: "10",
        },
      ],
    },
    {
      slug: "get-dream-team",
      label: "Get dream team",
      description:
        "Official FPL dream team XI for a gameweek, including the highest-scoring player.",
      category: "Fantasy Premier League",
      stepFunction: "getDreamTeamStep",
      stepImportPath: "get-dream-team",
      outputFields: [
        { field: "success", description: "Whether the lookup succeeded" },
        { field: "event_id", description: "Gameweek id" },
        { field: "top_element_points", description: "Points scored by the top player" },
        { field: "team", description: "The 11 dream-team players" },
        { field: "error", description: "Error message if the lookup failed" },
      ],
      configFields: [
        {
          key: "eventId",
          label: "Gameweek ID",
          type: "template-input",
          placeholder: "Leave blank for the current gameweek",
          example: "1",
        },
      ],
    },
    {
      slug: "get-manager",
      label: "Get manager",
      description: "Public manager entry: name, points, rank, and favourite team",
      category: "Fantasy Premier League",
      stepFunction: "getManagerStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "id", description: "Manager ID" },
        { field: "name", description: "Team name" },
        { field: "player_first_name", description: "First name" },
        { field: "player_last_name", description: "Last name" },
        { field: "summary_overall_points", description: "Overall points" },
        { field: "summary_overall_rank", description: "Overall rank" },
      ],
      configFields: [
        {
          key: "managerId",
          label: "Manager ID",
          type: "template-input",
          placeholder: "1 or {{NodeName.managerId}}",
          example: "1",
          required: true,
        },
      ],
    },
    {
      slug: "get-manager-history",
      label: "Get manager history",
      description: "Current season, past seasons, and chips for a manager",
      category: "Fantasy Premier League",
      stepFunction: "getManagerHistoryStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "current", description: "This season by gameweek" },
        { field: "past", description: "Previous seasons" },
        { field: "chips", description: "Chip usage" },
      ],
      configFields: [
        {
          key: "managerId",
          label: "Manager ID",
          type: "template-input",
          placeholder: "1 or {{GetManager.id}}",
          example: "1",
          required: true,
        },
      ],
    },
    {
      slug: "get-manager-picks",
      label: "Get manager picks",
      description: "Squad, captain, and chip for a manager in one gameweek",
      category: "Fantasy Premier League",
      stepFunction: "getManagerPicksStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "picks", description: "Squad picks" },
        { field: "entry_history", description: "Gameweek points and transfers" },
        { field: "active_chip", description: "Chip played this gameweek" },
        { field: "automatic_subs", description: "Automatic substitutions" },
      ],
      configFields: [
        {
          key: "managerId",
          label: "Manager ID",
          type: "template-input",
          placeholder: "1 or {{GetManager.id}}",
          example: "1",
          required: true,
        },
        {
          key: "gameweek",
          label: "Gameweek",
          type: "template-input",
          placeholder: "1 or {{GetEvents.events.0.id}}",
          example: "1",
          required: true,
        },
      ],
    },
    {
      slug: "get-manager-transfers",
      label: "Get manager transfers",
      description: "Transfer history for a manager",
      category: "Fantasy Premier League",
      stepFunction: "getManagerTransfersStep",
      stepImportPath: "fpl",
      outputFields: [{ field: "transfers", description: "Transfers" }],
      configFields: [
        {
          key: "managerId",
          label: "Manager ID",
          type: "template-input",
          placeholder: "1 or {{GetManager.id}}",
          example: "1",
          required: true,
        },
      ],
    },
    {
      slug: "get-classic-standings",
      label: "Get classic standings",
      description: "Standings for a classic league",
      category: "Fantasy Premier League",
      stepFunction: "getClassicStandingsStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "league", description: "League metadata" },
        { field: "standings", description: "Standings page" },
        { field: "new_entries", description: "New entries" },
      ],
      configFields: [
        {
          key: "leagueId",
          label: "League ID",
          type: "template-input",
          placeholder: "314 or {{NodeName.leagueId}}",
          example: "314",
          required: true,
        },
      ],
    },
    {
      slug: "get-h2h-standings",
      label: "Get H2H standings",
      description: "Standings for a head-to-head league",
      category: "Fantasy Premier League",
      stepFunction: "getH2hStandingsStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "league", description: "League metadata" },
        { field: "standings", description: "Standings page" },
        { field: "new_entries", description: "New entries" },
      ],
      configFields: [
        {
          key: "leagueId",
          label: "League ID",
          type: "template-input",
          placeholder: "1 or {{NodeName.leagueId}}",
          example: "1",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(fantasyPremierLeaguePlugin);
export default fantasyPremierLeaguePlugin;
