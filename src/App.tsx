import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { PageRouter } from "@app/PageRouter.tsx";
import { CommandPalette } from "@components/CommandPalette.tsx";
import { DeviceSelector } from "@components/DeviceSelector.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { Toaster } from "@components/Toaster.tsx";
import Footer from "@components/UI/Footer.tsx";
import { ThemeController } from "@components/generic/ThemeController.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import { MapProvider } from "react-map-gl";

export const App = (): JSX.Element => {

 const { addDevice } = useDeviceStore();
 const { setSelectedDevice } = useAppStore();

 useEffect(() => {
   
 fetch("/nodes.json")
      .then((resp) => resp.json())
      .then(async (json) => {
        for (const item of json) {
          const id = item.id;
          const device = addDevice(id);
          const connection = new HttpConnection(id);
          await connection.connect({
            address: item.ip,
            fetchInterval: item.interval,
            tls: item.tls,
          });

          setSelectedDevice(id);
          device.addConnection(connection);
          subscribeAll(device, connection);
        }
      });
  }, [addDevice, setSelectedDevice]);


  
  const { getDevice } = useDeviceStore();
  const { selectedDevice, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <ThemeController>
      <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      />
      <Toaster />
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex h-screen flex-col overflow-hidden bg-backgroundPrimary text-textPrimary">
            <div className="flex flex-grow">
              <DeviceSelector />
              <div className="flex flex-grow flex-col">
                {device ? (
                  <div className="flex h-screen">
                    <DialogManager />
                    <CommandPalette />
                    <PageRouter />
                  </div>
                ) : (
                  <>
                    <Dashboard />
                    <div className="flex flex-grow" />
                    <Footer />
                  </>
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
