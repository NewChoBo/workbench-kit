export const JDW_FIXTURE_COLUMN_TEXT = `{
  "type": "column",
  "args": {
    "gap": 12,
    "padding": 16,
    "children": [
      { "type": "text", "args": { "text": "Hello JDW", "fontSize": 20 } },
      { "type": "text", "args": { "text": "workbench-jdw-react-v1" } }
    ]
  }
}
`;

export const JDW_FIXTURE_ROW_FLEX = `{
  "type": "row",
  "args": {
    "gap": 8,
    "padding": 12,
    "children": [
      {
        "type": "expanded",
        "args": {
          "flex": 1,
          "child": { "type": "text", "args": { "text": "Left", "background": "#2b2f36" } }
        }
      },
      {
        "type": "expanded",
        "args": {
          "flex": 2,
          "child": { "type": "text", "args": { "text": "Right (flex 2)", "background": "#353a42" } }
        }
      }
    ]
  }
}
`;

export const JDW_FIXTURE_GRID_CELLS = `{
  "type": "grid",
  "args": {
    "columns": 2,
    "gap": 8,
    "padding": 12,
    "children": [
      { "type": "text", "args": { "text": "A", "col": 0, "row": 0 } },
      { "type": "text", "args": { "text": "B", "col": 1, "row": 0 } },
      { "type": "text", "args": { "text": "Wide", "col": 0, "row": 1, "colSpan": 2 } }
    ]
  }
}
`;
