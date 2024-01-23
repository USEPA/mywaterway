declare module 'glossary-panel' {
  declare class Glossary {
    constructor(
      terms: Array<{
        term: string;
        definition: string;
      }>,
    );

    addEventListener(
      elm: HTMLElement,
      event: Event,
      callback: (unknown) => void,
    ): void;
    clearTerms: void;
    closeOpenGlossary(e: MouseEvent): void;
    destroy: void;
    findTerm(term: string, fromTouch?: boolean): void;
    handleInput: void;
    handleKeyup(e: KeyboardEvent): void;
    handleTermTouch(e: MouseEvent): void;
    hide: void;
    initList: void;
    linkTerms: void;
    populate: void;
    show: void;
    toggle: void;
  }

  export default Glossary;
}
