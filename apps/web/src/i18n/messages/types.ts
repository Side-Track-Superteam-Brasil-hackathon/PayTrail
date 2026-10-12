/** Mesmo conjunto de chaves do dicionário em inglês, com textos em outro idioma. */
export type Messages<T> = { [K in keyof T]: string };
