#include <X11/Xatom.h>
#include <X11/Xlib.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

enum {
  SYSTEM_TRAY_REQUEST_DOCK = 0,
  XEMBED_EMBEDDED_NOTIFY = 0,
};

int main(void) {
  Display *display = XOpenDisplay(NULL);
  if (!display) {
    fputs("could not open X display\n", stderr);
    return 1;
  }

  int screen = DefaultScreen(display);
  Window root = RootWindow(display, screen);
  Window host = XCreateSimpleWindow(
      display, root, 2200, 900, 160, 48, 1,
      BlackPixel(display, screen), WhitePixel(display, screen));
  XStoreName(display, host, "File Viewer Companion test tray host");
  XSelectInput(display, host,
               ExposureMask | StructureNotifyMask | SubstructureNotifyMask);

  char selection_name[64];
  snprintf(selection_name, sizeof(selection_name), "_NET_SYSTEM_TRAY_S%d", screen);
  Atom selection = XInternAtom(display, selection_name, False);
  Atom manager = XInternAtom(display, "MANAGER", False);
  Atom opcode = XInternAtom(display, "_NET_SYSTEM_TRAY_OPCODE", False);
  Atom xembed = XInternAtom(display, "_XEMBED", False);
  Atom orientation = XInternAtom(display, "_NET_SYSTEM_TRAY_ORIENTATION", False);
  unsigned long horizontal = 0;
  XChangeProperty(display, host, orientation, XA_CARDINAL, 32, PropModeReplace,
                  (unsigned char *)&horizontal, 1);

  XSetSelectionOwner(display, selection, host, CurrentTime);
  if (XGetSelectionOwner(display, selection) != host) {
    fputs("could not claim system tray selection\n", stderr);
    XCloseDisplay(display);
    return 2;
  }
  XMapRaised(display, host);

  XEvent announcement;
  memset(&announcement, 0, sizeof(announcement));
  announcement.xclient.type = ClientMessage;
  announcement.xclient.window = root;
  announcement.xclient.message_type = manager;
  announcement.xclient.format = 32;
  announcement.xclient.data.l[0] = CurrentTime;
  announcement.xclient.data.l[1] = selection;
  announcement.xclient.data.l[2] = host;
  XSendEvent(display, root, False, StructureNotifyMask, &announcement);
  XFlush(display);
  printf("tray host ready window=0x%lx selection=%s\n", host, selection_name);
  fflush(stdout);

  for (;;) {
    XEvent event;
    XNextEvent(display, &event);
    if (event.type != ClientMessage || event.xclient.message_type != opcode ||
        event.xclient.data.l[1] != SYSTEM_TRAY_REQUEST_DOCK) {
      continue;
    }

    Window icon = (Window)event.xclient.data.l[2];
    XSelectInput(display, icon,
                 StructureNotifyMask | PropertyChangeMask | ButtonPressMask |
                     ButtonReleaseMask);
    XReparentWindow(display, icon, host, 8, 8);
    XResizeWindow(display, icon, 32, 32);
    XMapRaised(display, icon);

    XEvent notify;
    memset(&notify, 0, sizeof(notify));
    notify.xclient.type = ClientMessage;
    notify.xclient.window = icon;
    notify.xclient.message_type = xembed;
    notify.xclient.format = 32;
    notify.xclient.data.l[0] = CurrentTime;
    notify.xclient.data.l[1] = XEMBED_EMBEDDED_NOTIFY;
    notify.xclient.data.l[2] = 0;
    notify.xclient.data.l[3] = host;
    notify.xclient.data.l[4] = 0;
    XSendEvent(display, icon, False, NoEventMask, &notify);
    XFlush(display);
    printf("docked icon window=0x%lx\n", icon);
    fflush(stdout);
  }
}
