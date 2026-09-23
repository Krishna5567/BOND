; What Bond offers to open on Windows. The Mac half of this rule is the
; fileAssociations list in electron-builder.yml, and the reasoning is the same:
; Bond appears under "Open with" for documents it renders, and it NEVER takes
; the default. A workbench does not own markdown, so installing Bond must not
; change what a double-click does. Making it the default stays a deliberate act:
; Open with -> Choose another app -> Always.
;
; electron-builder's own `win.fileAssociations` cannot do this. Its template
; writes the extension's default value (Software\Classes\.md = its ProgID),
; which IS taking the default on any PC where nobody has picked an app for the
; type, and its uninstaller leaves that value pointing at a ProgID it has just
; deleted. So the registration is written out here instead, with the two keys
; Windows provides for exactly this:
;
;   .ext\OpenWithProgids            "this ProgID can open .ext" - a candidate,
;                                   listed under Open with, never the default
;   Applications\Bond.exe\SupportedTypes
;                                   the same promise keyed by exe, which is what
;                                   keeps Bond OUT of Open with for every other
;                                   type once a person has browsed to it once
;
; SHELL_CONTEXT is HKCU for a per-user install and HKLM for an all-users one;
; electron-builder has already set it by the time these macros run.
;
; Keep the extensions in step with OPEN_EXT in src/main/open-with.js, which
; decides where the file lands. tests/windows-installer.test.mjs holds the two
; together, and checks that nothing here ever writes a type's default value.

!macro BondOpenWith EXT PROGID
  WriteRegNone SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".${EXT}" ""
!macroend

; /ifempty: on a PC that had never heard of .mdx the install created these keys,
; so the uninstall takes them away again — but only when nothing else is in
; them. Another program's entry, or the type's own default, is left alone.
!macro BondOpenWithRemove EXT PROGID
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}"
!macroend

; The exe is quoted. electron-builder's own template does not quote it, and an
; install folder with a space in it then opens nothing.
!macro BondProgId PROGID DESCRIPTION
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}" "" "${DESCRIPTION}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\DefaultIcon" "" "$appExe,0"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\shell\open\command" "" '"$appExe" "%1"'
!macroend

!macro customInstall
  !insertmacro BondProgId "Bond.Markdown" "Markdown document"
  !insertmacro BondProgId "Bond.Text" "Plain text document"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "${PRODUCT_NAME}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$appExe" "%1"'
  !insertmacro BondOpenWith "md" "Bond.Markdown"
  !insertmacro BondOpenWith "markdown" "Bond.Markdown"
  !insertmacro BondOpenWith "mdx" "Bond.Markdown"
  !insertmacro BondOpenWith "txt" "Bond.Text"
  !insertmacro BondOpenWith "text" "Bond.Text"
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

; An update runs the old uninstaller first. Nothing is removed then: the new
; installer writes the same keys a moment later, and a person who did choose
; Bond as their default keeps a ProgID that never stopped existing.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    !insertmacro BondOpenWithRemove "md" "Bond.Markdown"
    !insertmacro BondOpenWithRemove "markdown" "Bond.Markdown"
    !insertmacro BondOpenWithRemove "mdx" "Bond.Markdown"
    !insertmacro BondOpenWithRemove "txt" "Bond.Text"
    !insertmacro BondOpenWithRemove "text" "Bond.Text"
    DeleteRegKey SHELL_CONTEXT "Software\Classes\Bond.Markdown"
    DeleteRegKey SHELL_CONTEXT "Software\Classes\Bond.Text"
    DeleteRegKey SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  ${endIf}
!macroend
