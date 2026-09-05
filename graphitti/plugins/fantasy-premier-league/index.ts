import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { FantasyPremierLeagueIcon } from "./icon";

const fantasyPremierLeaguePlugin: IntegrationPlugin = {
  type: "fantasy-premier-league",
  label: "Fantasy Premier League",
  description:
    "Read public Fantasy Premier League data: players, fixtures, managers, and league standings.",
  icon: FantasyPremierLeagueIcon,
  formFields: [],
  testConfig: {
    getTestFunction: async () => {
      const { testFantasyPremierLeague } = await import("./test");
      return testFantasyPremierLeague;
    },
  },
  actions: [
    {
      slug: "get-bootstrap",
      label: "Get bootstrap",
      description: "Game state: events, teams, players, and element types",
      category: "Fantasy Premier League",
      stepFunction: "getBootstrapStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "events", description: "Gameweeks" },
        { field: "teams", description: "Premier League teams" },
        { field: "elements", description: "Players" },
        { field: "element_types", description: "Positions" },
        { field: "total_players", description: "Registered FPL managers" },
      ],
      configFields: [],
    },
    {
      slug: "search-players",
      label: "Search players",
      description: "Filter bootstrap players by name, team, position, or status",
      category: "Fantasy Premier League",
      stepFunction: "searchPlayersStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "players", description: "Matching players" },
        { field: "count", description: "Number of matches" },
      ],
      configFields: [
        {
          key: "name",
          label: "Name",
          type: "template-input",
          placeholder: "Salah or {{NodeName.playerName}}",
          example: "Salah",
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
      ],
    },
    {
      slug: "get-player",
      label: "Get player",
      description: "Fixtures, history, and past seasons for a player",
      category: "Fantasy Premier League",
      stepFunction: "getPlayerStep",
      stepImportPath: "fpl",
      outputFields: [
        { field: "fixtures", description: "Upcoming fixtures" },
        { field: "history", description: "This season by gameweek" },
        { field: "history_past", description: "Previous seasons" },
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
      slug: "get-fixtures",
      label: "Get fixtures",
      description: "All fixtures, or one gameweek when Event is set",
      category: "Fantasy Premier League",
      stepFunction: "getFixturesStep",
      stepImportPath: "fpl",
      outputFields: [{ field: "fixtures", description: "Fixture list" }],
      configFields: [
        {
          key: "event",
          label: "Event",
          type: "template-input",
          placeholder: "Gameweek number, or leave blank for all",
          example: "1",
        },
      ],
    },
    {
      slug: "get-gameweek-live",
      label: "Get gameweek live",
      description: "Live points and stats for every player in a gameweek",
      category: "Fantasy Premier League",
      stepFunction: "getGameweekLiveStep",
      stepImportPath: "fpl",
      outputFields: [{ field: "elements", description: "Live player stats" }],
      configFields: [
        {
          key: "gameweek",
          label: "Gameweek",
          type: "template-input",
          placeholder: "1 or {{GetBootstrap.events.0.id}}",
          example: "1",
          required: true,
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
          placeholder: "1 or {{GetBootstrap.events.0.id}}",
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
