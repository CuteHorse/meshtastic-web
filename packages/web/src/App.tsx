import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { useTheme } from "@core/hooks/useTheme.ts";
import { SidebarProvider, useAppStore, useDeviceStore, useMessageStore, useNodeDBStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { Connections } from "@pages/Connections/index.tsx";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";

export function App() {
  useTheme();

  const { getDevice, addDevice } = useDeviceStore();
  const { selectedDeviceId, setSelectedDevice } = useAppStore();
  const { addNodeDB } = useNodeDBStore();
  const { addMessageStore } = useMessageStore();

  const device = getDevice(selectedDeviceId);

  // Auto-load nodes from nodes.json
  useEffect(() => {
    fetch("/nodes.json")
      .then((resp) => resp.json())
      .then(async (json) => {
        for (const item of json) {
          const deviceId = item.id;
          const device = addDevice(deviceId);
          const nodeDB = addNodeDB(deviceId);
          const messageStore = addMessageStore(deviceId);

          // Determine if TLS should be used
          const isTLS = item.tls === true;

          // Add protocol if missing
          let urlString = item.ip;
          if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
            urlString = (isTLS ? "https://" : "http://") + urlString;
          }

          const url = new URL(urlString);
          // Include pathname to support subfolders (e.g., /lh01)
          const hostWithPath = url.host + url.pathname.replace(/\/$/, ''); // Remove trailing slash
          const transport = await TransportHTTP.create(hostWithPath, isTLS);
            await transport.connect();
          const meshDevice = new MeshDevice(deviceId);
          meshDevice.addConnection(transport);
          device.setConnection(meshDevice);

          subscribeAll(device, meshDevice, messageStore, nodeDB);

          // Configure the device
          await meshDevice.configure();
          setSelectedDevice(deviceId);
        }
      })
      .catch((error) => {
        console.log("No nodes.json file found or error loading nodes:", error);
      });
  }, [addDevice, setSelectedDevice, addNodeDB, addMessageStore]);

  return (
    // <ThemeProvider defaultTheme="system" storageKey="theme">
    <ErrorBoundary FallbackComponent={ErrorPage}>
      {/* <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      /> */}
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
      <DeviceWrapper deviceId={selectedDeviceId}>
        <div
          className="flex h-screen flex-col bg-background-primary text-text-primary"
          style={{ scrollbarWidth: "thin" }}
        >
          <SidebarProvider>
            <div className="h-full flex flex-1 flex-col">
              {device ? (
                <div className="h-full flex w-full">
                  <DialogManager />
                  <KeyBackupReminder />
                  <CommandPalette />
                  <MapProvider>
                    <Outlet />
                  </MapProvider>
                </div>
              ) : (
                <>
                  <Connections />
                  <Footer />
                </>
              )}
            </div>
          </SidebarProvider>
        </div>
      </DeviceWrapper>
    </ErrorBoundary>
    // </ThemeProvider>
  );
}
