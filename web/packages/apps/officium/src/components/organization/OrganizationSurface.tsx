"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "../configuration/ConfigPage";
import { NicknameSection } from "./NicknameSection";
import { OrganizationHeading } from "./OrganizationHeading";
import { PeoplePanel } from "./PeoplePanel";
import { TeamsPanel } from "./TeamsPanel";
import { useOrganizationProfile } from "./use-organization-profile";

/**
 * The Organization surface (JAVA-57, Cfg-Org): the organization's name, your nickname, then People (everyone with access
 * to a project the caller owns) and Teams (grant `editor`/`viewer` on the owner's own projects to a whole group at once).
 * `contexts/iam`'s `Organization` is the account, not a group of people -- teams are Officium's own, which is why they're
 * managed here and not on some ecosystem-wide settings page.
 */
export function OrganizationSurface() {
  const { profile, failed, rename } = useOrganizationProfile();
  const { configuration } = useCopy();
  const [people, setPeople] = useState<number | undefined>(undefined);
  const [teams, setTeams] = useState<number | undefined>(undefined);
  const onPeople = useCallback((count: number) => setPeople(count), []);
  const onTeams = useCallback((count: number) => setTeams(count), []);
  return (
    // `officium-rise` on each tab: a tab switched to rises into place instead of popping (motion job 2).
    <ConfigPage title={configuration.sections.organization} lede="The people and teams who share your projects.">
      <OrganizationHeading profile={profile} failed={failed} onRename={rename} />
      <NicknameSection />
      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people" count={people === undefined ? undefined : people + (profile ? 1 : 0)}>
            People
          </TabsTrigger>
          <TabsTrigger value="teams" count={teams}>
            Teams
          </TabsTrigger>
        </TabsList>
        <TabsContent value="people" className="officium-rise mt-4">
          <PeoplePanel owner={profile?.owner ?? null} onCount={onPeople} />
        </TabsContent>
        <TabsContent value="teams" forceMount className="officium-rise mt-4 data-[state=inactive]:hidden">
          <TeamsPanel onCount={onTeams} />
        </TabsContent>
      </Tabs>
    </ConfigPage>
  );
}
