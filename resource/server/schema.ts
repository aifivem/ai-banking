import type { PanelSchema } from "@aifivem/shared";
import { PLACE_SECTIONS, placeTab } from "./placeSchema";

/** ai-banking's panel: bank branches, ATM models and limits, the transfer fee and the police switch. */
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
      sections: PLACE_SECTIONS,
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
        atmDailyLimit: {
          type: "number",
          min: 0,
          max: 100_000_000,
          integer: true,
        },
        transferFee: { type: "number", min: 0, max: 50 },
        reportSightings: { type: "bool" },
      },
    },
  },
  tabs: [
    placeTab("banks", "building-columns", {
      tab: "ADMIN_TAB_BANKS",
      tabDesc: "ADMIN_TAB_BANKS_DESC",
      create: "ADMIN_NEW_BANK",
      remove: "ADMIN_DELETE_BANK",
      card: "ADMIN_C_BANK",
      cardDesc: "ADMIN_C_BANK_DESC",
      placeholder: "ADMIN_P_LABEL",
      coordsHint: "ADMIN_H_COORDS",
    }),
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
              path: "atmDailyLimit",
              label: "ADMIN_F_ATM_DAILY",
              hint: "ADMIN_H_ATM_DAILY",
              min: 0,
              max: 100_000_000,
              step: 1000,
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
        {
          icon: "handcuffs",
          title: "ADMIN_C_POLICE",
          desc: "ADMIN_C_POLICE_DESC",
          fields: [
            {
              widget: "switch",
              path: "reportSightings",
              label: "ADMIN_F_SIGHTINGS",
              hint: "ADMIN_H_SIGHTINGS",
            },
          ],
        },
      ],
    },
  ],
};
