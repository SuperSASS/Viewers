import React from 'react';

export default function getCustomizationModule() {
  return [
    {
      name: 'Routes',
      value: {
        id: 'customRoutes',
        routes: [
          {
            path: '/custommy',
            children: () => (
              <h1 style={{ color: 'red' }}>MY Hello Custom Route</h1>
            ),
          },
        ],
      },
    },
  ];
}
