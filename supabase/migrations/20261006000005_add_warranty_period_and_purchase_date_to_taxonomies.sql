-- ==============================================================================
-- Migration: 20261006000005_add_warranty_period_and_purchase_date_to_taxonomies.sql
-- Description:
--   Ensure purchase_date, warranty_period, and warranty_expires are defined
--   across all device, appliance, and tool tag groups.
-- ==============================================================================

-- 1. Update Electronics, Computing & Smart Tech blueprints
update public.tag_groups
set schema_blueprint = '[
  {"key": "manufacturer", "label": "Manufacturer / Brand", "type": "text", "placeholder": "e.g. Apple, Sony, Dell", "filterable": true, "sortable": true},
  {"key": "model_number", "label": "Model / Part #", "type": "text", "placeholder": "e.g. A2485, WH-1000XM5"},
  {"key": "serial_number", "label": "Serial Number", "type": "text", "placeholder": "S/N for warranty & recovery"},
  {"key": "purchase_date", "label": "Purchase Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "warranty_period", "label": "Warranty Period", "type": "text", "placeholder": "e.g. 1 Year, 2 Years, Lifetime"},
  {"key": "warranty_expires", "label": "Warranty Expiration", "type": "date", "filterable": true, "sortable": true},
  {"key": "firmware_os", "label": "Firmware / OS", "type": "text", "placeholder": "e.g. macOS Sonoma, v2.1.0"},
  {"key": "power_specs", "label": "Power & Voltage", "type": "text", "placeholder": "e.g. 65W USB-C PD, 220V"},
  {"key": "battery_type", "label": "Power / Battery Source", "type": "select", "options": ["Rechargeable (USB/Built-in)", "Removable AA/AAA", "Coin Cell (CR2032)", "Lead Acid / IPS Battery", "Mains Powered (AC 220V)"], "filterable": true},
  {"key": "last_charged_date", "label": "Last Charged Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "next_charge_due", "label": "Next Charge Due", "type": "date", "filterable": true, "sortable": true},
  {"key": "last_calibrated_date", "label": "Last Calibrated / Zeroed", "type": "date", "filterable": true, "sortable": true}
]'::jsonb,
updated_at = now()
where feature = 'homeops' and slug = 'electronics-computing-smart-tech';

-- 2. Update Appliances & Climate Control blueprints
update public.tag_groups
set schema_blueprint = '[
  {"key": "brand", "label": "Brand / Maker", "type": "text", "placeholder": "e.g. Bosch, Walton, Singer", "filterable": true},
  {"key": "model_number", "label": "Model Number", "type": "text", "placeholder": "e.g. B36CL80ENS"},
  {"key": "purchase_date", "label": "Purchase Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "warranty_period", "label": "Warranty Period", "type": "text", "placeholder": "e.g. 1 Year, 5 Years, 10 Years Motor"},
  {"key": "warranty_expires", "label": "Warranty Expiration", "type": "date", "filterable": true, "sortable": true},
  {"key": "filter_model", "label": "Filter / Consumable Part #", "type": "text", "placeholder": "e.g. Filter Type A, HEPA-13"},
  {"key": "last_serviced", "label": "Last Cleaned / Serviced", "type": "date"},
  {"key": "service_interval_months", "label": "Service Interval (Months)", "type": "number", "unit": "months"},
  {"key": "power_source", "label": "Power Source", "type": "select", "options": ["Corded AC (220V)", "Rechargeable Battery", "Removable AA/AAA Batteries", "LPG Cylinder / Gas", "Manual"], "filterable": true},
  {"key": "last_charged_date", "label": "Last Charged Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "next_charge_due", "label": "Next Charge Due", "type": "date", "filterable": true, "sortable": true}
]'::jsonb,
updated_at = now()
where feature = 'homeops' and slug = 'appliances-climate-control';

-- 3. Update Tools, Hardware & Workshop blueprints
update public.tag_groups
set schema_blueprint = '[
  {"key": "brand", "label": "Brand / Tool Maker", "type": "text", "placeholder": "e.g. DeWalt, Bosch, Ingco", "filterable": true},
  {"key": "drive_size", "label": "Drive / Fitting Size", "type": "text", "placeholder": "e.g. 1/4 inch, 1/2 inch, M4, M6"},
  {"key": "purchase_date", "label": "Purchase Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "warranty_period", "label": "Warranty Period", "type": "text", "placeholder": "e.g. 1 Year, 3 Years, Lifetime"},
  {"key": "warranty_expires", "label": "Warranty Expiration", "type": "date", "filterable": true, "sortable": true},
  {"key": "power_source", "label": "Power Source", "type": "select", "options": ["Manual / Hand", "Cordless Battery (12V/18V/20V)", "Corded AC (220V)", "Pneumatic / Air"], "filterable": true},
  {"key": "last_charged_date", "label": "Last Charged Date", "type": "date", "filterable": true, "sortable": true},
  {"key": "next_charge_due", "label": "Next Charge Due", "type": "date", "filterable": true, "sortable": true},
  {"key": "storage_box", "label": "Toolbox / Bin Location", "type": "text", "placeholder": "e.g. Workshop Rack 2, Drawer A"}
]'::jsonb,
updated_at = now()
where feature = 'homeops' and slug = 'tools-hardware-workshop';
