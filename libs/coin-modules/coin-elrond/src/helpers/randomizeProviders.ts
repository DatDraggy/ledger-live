import type { MultiversxProvider } from "../types";

/*
 * Declare the type for the extended validator object that has the sort key attached.
 */

export interface SortedValidatorType {
  provider: MultiversxProvider;
  sort: number;
}

/*
 * Map through the providers, assign a random number, sort by that, then return the original providers' list.
 */

export const randomizeProviders = (providers: MultiversxProvider[]) =>
  providers
    .map(provider => ({ provider, sort: Math.random() }))
    .sort((alpha: SortedValidatorType, beta: SortedValidatorType) => alpha.sort - beta.sort)
    .map((item: SortedValidatorType) => item.provider);
