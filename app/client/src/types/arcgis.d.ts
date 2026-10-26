import type Credential from '@arcgis/core/identity/Credential';

/*
  As of @arcgis/core 5.0 the `__esri` members are type aliases, so augmenting them
  with `declare namespace __esri` shadows the real class types instead of merging.
  Augment the individual modules instead.
*/
declare module '@arcgis/core/portal/Portal' {
  export default interface Portal {
    credential: Credential;
  }
}
