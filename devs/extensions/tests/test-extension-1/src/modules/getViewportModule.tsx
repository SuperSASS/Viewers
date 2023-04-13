import React from "react";

const Component = React.lazy(() => {
  return import(
    /* webpackPrefetch: true */ "../Viewport/CocketBoatVtkSegViewport"//"../Viewport/CocketBoatVTKViewport"
  );
});

const CocketBoatVTKViewport = props => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default function getViewportModule({ servicesManager, commandsManager }) {
  const ExtendedCocketBoatVTKViewport = props => {
    // const onNewImageHandler = jumpData => {
    //   commandsManager.runCommand('jumpToImage', jumpData);
    // };
    // const { toolbarService } = (servicesManager as ServicesManager).services;

    return (
      <CocketBoatVTKViewport
        {...props}
        // ToolbarService={toolbarService}
        servicesManager={servicesManager}
        commandsManager={commandsManager}
      />
    );
  };

  return [
    {
      name: 'vtk',
      component: ExtendedCocketBoatVTKViewport,
    },
  ];
};
