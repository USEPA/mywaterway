import React from 'react';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';

export const useFields = [
  {
    value: 'drinkingwater_use',
    label: 'Drinking Water',
    term: 'Drinking Water Use',
  },
  { value: 'ecological_use', label: 'Aquatic Life', term: 'Aquatic Life' },
  {
    value: 'fishconsumption_use',
    label: 'Fish and Shellfish Consumption',
    term: 'Fish and Shellfish Consumption',
  },
  {
    value: 'recreation_use',
    label: 'Swimming and Boating',
    term: 'Swimming and Boating',
  },
  { value: 'cultural_use', label: 'Cultural', term: 'Cultural Use' },
  { value: 'other_use', label: 'Other', term: 'Other Use' },
];

export const impairmentFields = [
  {
    value: 'algal_growth',
    parameterGroup: 'ALGAL GROWTH',
    label: 'Algae',
    term: 'Algae',
    sentence: null,
  },
  {
    value: 'ammonia',
    parameterGroup: 'AMMONIA',
    label: 'Ammonia',
    term: 'Ammonia',
    sentence: null,
  },
  {
    value: 'biotoxins',
    parameterGroup: 'BIOTOXINS',
    label: 'Biological Poisons',
    term: 'Biological Poisons',
    sentence: null,
  },
  {
    value: 'cause_unknown',
    parameterGroup: 'CAUSE UNKNOWN',
    label: 'Cause Unknown',
    term: 'Cause Unknown',
    sentence: (
      <>
        have a{' '}
        <GlossaryTerm term="Cause Unknown">Cause that is Unknown</GlossaryTerm>
      </>
    ),
  },
  {
    value: 'cause_unknown_fish_kills',
    parameterGroup: 'CAUSE UNKNOWN - FISH KILLS',
    label: 'Fish Kills',
    term: 'Fish Kills',
    sentence: (
      <>
        experience <GlossaryTerm term="Fish Kills">Fish Kills</GlossaryTerm>,
      </>
    ),
  },
  {
    value: 'cause_unknown_impaired_biota',
    parameterGroup: 'CAUSE UNKNOWN - IMPAIRED BIOTA',
    label: 'Degraded Aquatic Life',
    term: 'Degraded Aquatic Life',
    sentence: (
      <>
        experience{' '}
        <GlossaryTerm term="Degraded Aquatic Life">
          Degraded Aquatic Life
        </GlossaryTerm>
      </>
    ),
  },
  {
    value: 'chlorine',
    parameterGroup: 'CHLORINE',
    label: 'Chlorine',
    term: 'Chlorine',
    sentence: null,
  },
  {
    value: 'dioxins',
    parameterGroup: 'DIOXINS',
    label: 'Dioxins',
    term: 'Dioxins',
    sentence: null,
  },
  {
    value: 'fish_consumption_advisory',
    parameterGroup: 'FISH CONSUMPTION ADVISORY',
    label: 'Fish Unsafe to Eat',
    term: 'Fish Unsafe to Eat',
    sentence: null,
  },
  {
    value: 'flow_alterations',
    parameterGroup: 'FLOW ALTERATION(S)',
    label: 'Flow Alterations',
    term: 'Abnormal Flow',
    sentence: null,
  },
  {
    value: 'habitat_alterations',
    parameterGroup: 'HABITAT ALTERATIONS',
    label: 'Degraded Habitat',
    term: 'Degraded Aquatic Habitat',
    sentence: (
      <>
        experience{' '}
        <GlossaryTerm term="Degraded Aquatic Habitat">
          Degraded Habitat
        </GlossaryTerm>
      </>
    ),
  },
  {
    value: 'hydrologic_alteration',
    parameterGroup: 'HYDROLOGIC ALTERATION',
    label: 'Abnormal Flow',
    term: 'Abnormal Flow',
    sentence: (
      <>
        have <GlossaryTerm term="Abnormal Flow">Abnormal Flow</GlossaryTerm>
      </>
    ),
  },
  {
    value: 'mercury',
    parameterGroup: 'MERCURY',
    label: 'Mercury',
    term: 'Mercury',
    sentence: null,
  },
  {
    value: 'metals_other_than_mercury',
    parameterGroup: 'METALS (OTHER THAN MERCURY)',
    label: 'Metals',
    term: 'Metals',
    sentence: null,
  },
  {
    value: 'noxious_aquatic_plants',
    parameterGroup: 'NOXIOUS AQUATIC PLANTS',
    label: 'Aquatic Weeds',
    term: 'Aquatic Weeds',
    sentence: null,
  },
  {
    value: 'nuisance_exotic_species',
    parameterGroup: 'NUISANCE EXOTIC SPECIES',
    label: 'Nuisance Plants or Animals (Foreign)',
    term: 'Nuisance Plants or Animals (Foreign)',
    sentence: null,
  },
  {
    value: 'nuisance_native_species',
    parameterGroup: 'NUISANCE NATIVE SPECIES',
    label: 'Nuisance Plants or Animals (Native)',
    term: 'Nuisance Plants or Animals (Native)',
    sentence: null,
  },
  {
    value: 'nutrients',
    parameterGroup: 'NUTRIENTS',
    label: 'Nitrogen and/or Phosphorus',
    term: 'Nitrogen and/or Phosphorus',
    sentence: null,
  },
  {
    value: 'oil_and_grease',
    parameterGroup: 'OIL AND GREASE',
    label: 'Oil and Grease',
    term: 'Oil and Grease',
    sentence: null,
  },
  {
    value: 'other_cause',
    parameterGroup: 'OTHER CAUSE',
    label: 'Impaired, Other Cause',
    term: 'Impaired, Other Cause',
    sentence: (
      <>
        contain{' '}
        <GlossaryTerm term="Impaired, Other Cause">
          Impairment for Other Causes
        </GlossaryTerm>
      </>
    ),
  },
  {
    value: 'oxygen_depletion',
    parameterGroup: 'ORGANIC ENRICHMENT/OXYGEN DEPLETION',
    label: 'Low Oxygen',
    term: 'Low Oxygen/Hypoxia',
    sentence: null,
  },
  {
    value: 'pathogens',
    parameterGroup: 'PATHOGENS',
    label: 'Bacteria and Other Microbes',
    term: 'Bacteria and Other Microbes',
    sentence: null,
  },
  {
    value: 'pesticides',
    parameterGroup: 'PESTICIDES',
    label: 'Pesticides',
    term: 'Pesticides',
    sentence: null,
  },
  {
    value: 'ph_acidity_caustic_conditions',
    parameterGroup: 'PH/ACIDITY/CAUSTIC CONDITIONS',
    label: 'Acidity',
    term: 'Acidity',
    sentence: (
      <>
        contain unbalanced <GlossaryTerm term="Acidity">Acidity</GlossaryTerm>
      </>
    ),
  },
  {
    value: 'polychlorinated_biphenyls_pcbs',
    parameterGroup: 'POLYCHLORINATED BIPHENYLS (PCBS)',
    label: 'PCBs',
    term: 'PCBs',
    sentence: null,
  },
  {
    value: 'radiation',
    parameterGroup: 'RADIATION',
    label: 'Radiation',
    term: 'Radiation',
    sentence: null,
  },
  {
    value: 'sediment',
    parameterGroup: 'SEDIMENT',
    label: 'Sediment',
    term: 'Sediment',
    sentence: null,
  },
  {
    value: 'solids_chlorides_sulfates',
    parameterGroup: 'SALINITY/TOTAL DISSOLVED SOLIDS/CHLORIDES/SULFATES',
    label: 'Salts',
    term: 'Salts',
    sentence: null,
  },
  {
    value: 'taste_color_and_odor',
    parameterGroup: 'TASTE, COLOR, AND ODOR',
    label: 'Taste, Color and Odor',
    term: 'Taste, Color, and Odor',
    sentence: (
      <>
        have abnormal{' '}
        <GlossaryTerm term="Taste, Color, and Odor">
          Taste, Color and Odor
        </GlossaryTerm>
      </>
    ),
  },
  {
    value: 'temperature',
    parameterGroup: 'TEMPERATURE',
    label: 'Temperature',
    term: 'Temperature',
    sentence: (
      <>
        experience damaging{' '}
        <GlossaryTerm term="Temperature">Temperatures</GlossaryTerm>
      </>
    ),
  },
  {
    value: 'total_toxics',
    parameterGroup: 'TOTAL TOXICS',
    label: 'Total Toxic Chemicals',
    term: 'Total Toxic Chemicals',
    sentence: null,
  },
  {
    value: 'toxic_inorganics',
    parameterGroup: 'TOXIC INORGANICS',
    label: 'Toxic Inorganic Chemicals',
    term: 'Toxic Inorganic Chemicals',
    sentence: null,
  },
  {
    value: 'toxic_organics',
    parameterGroup: 'TOXIC ORGANICS',
    label: 'Toxic Organic Chemicals',
    term: 'Toxic Organic Chemicals',
    sentence: null,
  },
  {
    value: 'trash',
    parameterGroup: 'TRASH',
    label: 'Trash',
    term: 'Trash',
    sentence: null,
  },
  {
    value: 'turbidity',
    parameterGroup: 'TURBIDITY',
    label: 'Murky Water',
    term: 'Murky Water',
    sentence: (
      <>
        have <GlossaryTerm term="Murky Water">Murky Water</GlossaryTerm>
      </>
    ),
  },
];
