import {
  BLIP_STYLE_FIELDS,
  PLACE_PED_SPEC,
  placePedFields,
} from "@aicore-fivem/lib/shared";
import type { PanelSchema } from "@aicore-fivem/shared";

/** ai-banking's panel: bank branches, ATM models and limits. */
export const bankingSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "building-columns",
  files: {
    banks: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: {
        label: "Fleeca Bank",
        coords: { x: 0, y: 0, z: 0 },
        radius: 3,
        blip: true,
        blipStyle: { sprite: 108, color: 2, scale: 0.7 },
      },
      sections: {
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
      },
    },
    settings: {
      kind: "settings",
      sync: "all",
      sections: {
        atmModels: {
          type: "names",
          max: 20,
          itemMax: 48,
          pattern: "^[a-z0-9_]{2,48}$",
        },
        atmLimit: { type: "number", min: 0, max: 10_000_000, integer: true },
        transferFee: { type: "number", min: 0, max: 50 },
      },
    },
  },
  tabs: [
    {
      id: "banks",
      file: "banks",
      icon: "building-columns",
      label: "ADMIN_TAB_BANKS",
      desc: "ADMIN_TAB_BANKS_DESC",
      createLabel: "ADMIN_NEW_BANK",
      deleteLabel: "ADMIN_DELETE_BANK",
      cards: [
        {
          icon: "building-columns",
          title: "ADMIN_C_BANK",
          desc: "ADMIN_C_BANK_DESC",
          fields: [
            {
              widget: "text",
              path: "label",
              suggest: { from: "coords" },
              label: "ADMIN_F_LABEL",
              placeholder: "ADMIN_P_LABEL",
            },
            {
              widget: "point",
              path: "coords",
              label: "ADMIN_F_COORDS",
              hint: "ADMIN_H_COORDS",
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
    },
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: [
        {
          icon: "money-bill-wave",
          title: "ADMIN_C_RULES",
          desc: "ADMIN_C_RULES_DESC",
          fields: [
            {
              widget: "tags",
              path: "atmModels",
              label: "ADMIN_F_ATM_MODELS",
              hint: "ADMIN_H_ATM_MODELS",
              placeholder: "ADMIN_P_ATM_MODELS",
            },
            {
              widget: "number",
              path: "atmLimit",
              label: "ADMIN_F_ATM_LIMIT",
              hint: "ADMIN_H_ATM_LIMIT",
              min: 0,
              max: 10_000_000,
              step: 500,
              unit: "$",
            },
            {
              widget: "number",
              path: "transferFee",
              label: "ADMIN_F_FEE",
              hint: "ADMIN_H_FEE",
              min: 0,
              max: 50,
              step: 0.5,
              unit: "%",
            },
          ],
        },
      ],
    },
  ],
};
