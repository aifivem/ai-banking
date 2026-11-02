import {
  BLIP_STYLE_FIELDS,
  PLACE_PED_SPEC,
  placePedFields,
} from "@aifivem/lib/shared";
import type { DataSpec, TabSpec } from "@aifivem/shared";

/** Data of a place (a bank branch): name, counter point, reach, blip and NPC. */
export const PLACE_SECTIONS: Record<string, DataSpec> = {
  ped: PLACE_PED_SPEC,
  label: { type: "text", min: 1, max: 48 },
  coords: { type: "vec3" },
  radius: { type: "number", min: 1, max: 20 },
  blip: { type: "bool" },
  blipStyle: {
    type: "object",
    optional: true,
    fields: BLIP_STYLE_FIELDS,
  },
};

/** A records tab of places: the place card (name, counter, reach, blip) and the NPC card; `keys` are lang keys. */
export function placeTab(
  file: string,
  icon: string,
  keys: {
    tab: string;
    tabDesc: string;
    create: string;
    remove: string;
    card: string;
    cardDesc: string;
    placeholder: string;
    coordsHint: string;
  },
): TabSpec {
  return {
    id: file,
    file,
    icon,
    label: keys.tab,
    desc: keys.tabDesc,
    createLabel: keys.create,
    deleteLabel: keys.remove,
    cards: [
      {
        icon,
        title: keys.card,
        desc: keys.cardDesc,
        fields: [
          {
            widget: "text",
            path: "label",
            suggest: { from: "coords" },
            label: "ADMIN_F_LABEL",
            placeholder: keys.placeholder,
          },
          {
            widget: "point",
            path: "coords",
            label: "ADMIN_F_COORDS",
            hint: keys.coordsHint,
            ground: true,
          },
          {
            widget: "number",
            path: "radius",
            label: "ADMIN_F_RADIUS",
            min: 1,
            max: 20,
            unit: "m",
          },
          { widget: "switch", path: "blip", label: "ADMIN_F_BLIP" },
          {
            widget: "blip",
            path: "blipStyle",
            label: "ADMIN_F_BLIP_STYLE",
            showIf: { path: "blip", values: [true] },
          },
        ],
      },
      {
        icon: "user",
        title: "ADMIN_C_PED",
        desc: "ADMIN_C_PED_DESC",
        fields: placePedFields(),
      },
    ],
  };
}
