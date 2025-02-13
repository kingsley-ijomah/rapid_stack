// path: src/app/graphql/apollo.config.ts

import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { Storage } from '@ionic/storage-angular';
import { environment } from 'src/environments/environment';

const uri = environment.backendEndpoint;

export function createApollo(httpLink: HttpLink, storage: Storage): ApolloClientOptions<any> {
  const authLink = setContext(async (_, { headers }) => {
    const token = await storage.get('authToken');
    const updatedHeaders = { ...headers };
    
    if (token) {
      updatedHeaders['Authorization'] = `Bearer ${token}`;
    }

    return { headers: updatedHeaders };
  });

  return {
    link: authLink.concat(httpLink.create({ uri })),
    cache: new InMemoryCache(),
    connectToDevTools: true,
  };
}