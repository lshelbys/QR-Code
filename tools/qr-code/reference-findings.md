# Screenshot reference findings

## Shared layout observed in screenshots 1–2

The reference uses a full green page background with a centered content column. A white mascot-style logo and wordmark sit at the upper left, while compact white utility navigation sits at the upper right. The QR type navigation is a single horizontal row below the header, with small uppercase labels, muted inactive text, and a white underline under the active type.

The primary white generator panel has a rounded outer surface and subtle shadow. It is split into a wider pale blue-gray settings column on the left and a narrower white preview/download column on the right. The left column starts with a blue icon block and an “ENTER CONTENT” row, followed by a type-specific field. Below that are three full-width accordion rows: “SET COLORS,” “ADD LOGO IMAGE,” and “CUSTOMIZE DESIGN.”

The right column shows a large black-and-white QR code, a thin quality slider with low/high labels and centered pixel-size text, green “Create QR Code” and blue “Download PNG” actions, then outlined vector-format buttons. A small note box sits at the bottom right. A green “QR Code Templates” tab hangs below the main panel. The lower left contains a blue upload prompt.

## Type-specific differences observed in screenshots 1–2

The URL state uses a one-line “Your URL” input with a prefilled web address and an OFF statistics/editability toggle beneath it. The Text state uses a taller multiline textarea, removes the statistics toggle, and adds the helper text “Line breaks are allowed.” The QR preview and right-side export treatment remain structurally consistent between states.

## Screenshot findings 3–4

The Location state is materially richer than the basic content states. It uses a “Search Your Address” field, side-by-side Latitude and Longitude inputs, an embedded map area with map/satellite controls and a marker, and a short manual-drag note before the three shared accordions. The preview column remains structurally unchanged.

The Facebook state adds radio choices for “Facebook URL” and “Share URL,” then a labeled URL field. This confirms that some types need a small choice row before their main input, while the shared accordions, upload prompt, and right-side export panel remain consistent.

## Screenshot findings 5–6

Twitter has a radio row with “Twitter URL” and “Tweet,” followed by a labeled URL field. YouTube uses a simpler single URL field with no radio row. Facebook, Twitter, and YouTube all retain the same shared panel geometry and action language, confirming that the type-specific content region should be flexible while the surrounding layout stays fixed.

## Screenshot findings 7–8

The Event state uses one full-width Event Title field, then a three-column row for Event Location, Starttime, and Endtime. The Wi-Fi state uses three side-by-side fields: Wireless SSID, Password, and Encryption, with a compact select-like field for encryption. Both states preserve the shared accordion stack and preview column.

## Screenshot findings 9–10

The Phone state is a compact single labeled field, similar in height to URL and YouTube. The meCard state is a dense three-column contact grid with Firstname, Lastname, Nickname; Phone 1–3; Email, Website, Birthday; Street, Zipcode, City; and State, Country, Notes. Its larger form pushes the shared accordion rows lower, but the right preview column remains fixed in concept.

## Screenshot findings 11–12

The Email state uses three vertical fields: Your Email, Subject, and a multiline Message textarea. The SMS state uses a phone-number field followed by a multiline message field. Both use the same accordion stack and lower-left upload prompt, reinforcing that content forms should be data-driven while sharing the same panel chrome.

## Screenshot finding 13

The vCard state begins with Version 2.1 and Version 3 radio options, then a dense three-column contact form: Firstname, Lastname, Organization; Position (Work), Phone (Work), Phone (Private); Phone (Mobile), Fax (Work), Fax (Private); Email, Website, Street; Zipcode, City, State; and Country. The shared accordion rows follow below the contact grid.

## Implementation implication

The generator should use a shared reference shell and a type-specific form renderer. The current generic single textarea is not sufficient for the supplied states; URL, text, email, SMS, location, Wi-Fi, event, social, vCard, meCard, and phone need distinct field groups while still feeding one encoded QR value for the live preview.

## Color controls refinement

The Set Colors accordion must provide a foreground mode selector with Single Color and Color Gradient options, an optional Custom Eye Color toggle, and a separate Background Color field. Gradient mode exposes a second foreground color and a choice between Linear Gradient and Radial Gradient. Custom eye colors expose one or two eye-color values depending on the selected foreground mode, along with an action that copies the foreground colors into the eye-color values. QR type labels should use bold weight and sit lower below the header divider.

## Customize Design refinement

The Customize Design accordion should open into three labeled tile collections: Body Shape, Eye Frame Shape, and Eye Ball Shape. Each collection uses many compact white preview tiles arranged in a horizontal-wrap grid, with a blue outlined selected tile. Body tiles represent distinct module families; eye-frame tiles represent outer finder-ring families; eye-ball tiles represent inner finder-marker families. Selections must visibly alter the live QR preview and remain represented in exports.

## Latest selector correction

The current reference reduces the visible selector inventory to twelve body tiles, ten eye-frame tiles, and ten eye-ball tiles. The required ordering follows the left-to-right screenshot sequence. Tile 8 in the body row is intentionally a narrow clipped mark, tile 10 is a compact plus-like mark, and the final body tile is a four-lobe cluster; these should not render as generic full QR patterns. Frame tile 5 is an octagon and tiles 8 and 10 are dotted/dashed outlines. The ball row should keep the distinct square, rounded square, circle, diamond, four-dot cluster, circle, clipped square, pixel square, slanted square, and bean variants.

## Live reference benchmark

The live reference uses a dark green hero shell behind the header, QR type navigation, and centered white generator board. The workbench is a 60/40 split with a pale blue-gray settings area at left and a white preview/download area at right. The type navigation is a single thin, uppercase line with subtle dividers. The first fold ends with a centered QR Code Templates button. Immediately below is a pale blue information section beginning with a “Get More” management-platform callout. Within QR Studio, this structural hierarchy and control placement should be mirrored while retaining independent name, mark, and copy.

The expanded Set Colors section uses a flat pale blue-gray field with simple radios, compact white color inputs, and no nested card treatment. The Customize Design section is tall and directly follows the accordion header: it contains dense 10–12 tile rows, short labels, then a thin quality slider and a narrow error-correction dropdown. The reference maintains one open accordion at a time, keeps the full preview panel visible alongside expanded controls, and uses small, consistent blue icon blocks as the primary active-state marker.

## Compact composition refinement

The latest target uses a smaller fixed-width composition centered within a short hero area. The header occupies only the top of that hero, the type row is immediately above the board, and the white workbench is approximately a 65/35 left-to-right split. Controls are denser, the QR preview is smaller, and the templates button protrudes beneath the board. The surrounding application page should remain white; green is a contained visual field supporting the compact header/workbench rather than the site-wide background.
