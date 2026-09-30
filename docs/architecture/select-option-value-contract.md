# Select option value contract

`Select` from `@workbench-kit/react/primitives` reads direct `<option>` children
for its visible button and listbox. Its retained native `<select>` supplies
change events. Both paths must agree on the supported option values.

## Supported values

An explicit, non-nullish `value` is converted to a string. In particular,
`value=""` remains empty and `value={0}` becomes `"0"`; neither falls back to the
label.

For an omitted, `undefined`, or `null` value, the supported implicit label is a
string, a number, or nested arrays of those values and empty React children
(`null`, `undefined`, and booleans). Text is concatenated without separators.
Runs of HTML ASCII whitespace (space, tab, line feed, form feed, and carriage
return) collapse to one space, and leading/trailing ASCII whitespace is removed.
Nonbreaking spaces and other Unicode spaces are preserved. Empty text produces
an empty value.

The native browser's `HTMLOptionElement.value` is the validation oracle for this
plain-text subset, following the [HTML option value
algorithm](https://html.spec.whatwg.org/multipage/form-elements.html#dom-option-value).
This is not general HTML or React rendering. Parsing does not execute component
functions, construct DOM, or flatten rich elements. The displayed React label
is preserved unchanged. Rich element, fragment, or component labels require an
explicit value; a missing rich-label value retains the empty fallback and is
outside the supported inference contract.

## Selection and events

Disabled flags and enabled-option keyboard traversal remain unchanged. An
uncontrolled Select initializes from `defaultValue`, or the first enabled
option, and owns subsequent selection. A controlled Select uses its supplied
`value` as the selection owner; the parent decides whether to accept a requested
change. `onChange`
and `onValueChange` expose the retained native select's actual event value.

Value inference does not deduplicate or rename options. Duplicate values and
source order are preserved, and the current value-based selected-label lookup
uses the first matching option. Duplicate React keys and multiple listbox rows
marked selected for equal values are existing presentation limitations. This
contract does not promise native duplicate-option selection parity.

## Limits

Optgroups, discovery of options wrapped in fragments, rich-label inference,
and multiple selection are outside this repair. No public prop, export,
selection owner, or product-specific policy is added. The focused parser and
server-rendering tests cover the supported values; real browser consumer tests
cover pointer/keyboard behavior, disabled choices, controlled accept/retain,
rerendered labels, native event agreement, and a native option value oracle.
