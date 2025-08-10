import { css } from "lit"

export const sharedCSS = css`
    .material-symbols-outlined {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;

        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;

        font-feature-settings: 'liga';
        vertical-align: text-bottom;
    }

    .symbol-filled {
        font-variation-settings: 'FILL' 1;
    }

    button {
        border-radius: 3px;
        margin: 1px;
        border-style: outset;
        border-width: 1px;
    }

    .hidden {
        visibility: hidden;
    }
`;