### LMS-SCRIPTS
Detta repository innehåller ett antal olika scripts som körs manuellt på utvecklardatorer.
Standarden är att det här finns ett antal olika kataloger med underprojekt, som innehåller scripts för olika områden.

Aktuella underprojekt:
- antagna: Innehåller scripts för att lägga till/ta bort antagna ur kurser i Canvas
- collect_sis_imports_errors: Innehåller scripts som sammanställer loggar för sis imports i Canvas
- handleDeadletter: Används i de fall vi vill läsa och/eller tömma deadletter på meddelanden.
- canvas_data_parser: Innehåller script för att parse:a en lokal sync av _Canvas Data Portal_ och leta efter en specifik kth-url för filmer. Scriptet förlitar sig på att man har en lokal installation av [ripgrep](https://github.com/BurntSushi/ripgrep).