// StudyAssignmentCard.tsx - обновленная версия

import { FC, useState } from "react";
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  Separator,
  Box,
  IconButton,
  Tooltip,
} from "@radix-ui/themes";
import { FiTrash2, FiMapPin, FiGlobe, FiEdit2 } from "react-icons/fi";
import { SiteSelector } from "@/components/PseudoSelector";
import { Study } from "@/types/study";
import { StudyUser } from "@/types/user";
import { StudySite } from "@/types/site";

interface StudyAssignmentCardProps {
  study: Study;
  assignedSiteIds: number[];
  assignedCountry?: string[];
  user: StudyUser; // Добавлен пользователь для фильтрации доступных опций
  allSites: StudySite[]; // Все доступные центры
  onUpdateSites: (siteIds: number[]) => void;
  onUpdateCountries: (countryCodes: string[]) => void;
  onRemove: () => void;
}

const StudyAssignmentCard: FC<StudyAssignmentCardProps> = ({
  study,
  assignedSiteIds,
  assignedCountry,
  user,
  allSites,
  onUpdateSites,
  onUpdateCountries,
  onRemove,
}) => {

  // Получаем список всех центров для этого исследования
  const studySites = allSites.filter((site) => site.study_id === study.id);
  
  
  const handleSiteChange = (siteIds: number[]) => {
    onUpdateSites(siteIds);
  };

  return (
    <Card variant="surface" style={{ backgroundColor: "var(--gray-2)" }}>
      <Flex direction="column" gap="3">
        {/* Заголовок исследования */}
        <Flex justify="between" align="start">
          <Box style={{ flex: 1 }}>
            <Flex gap="2" align="center" wrap="wrap">
              <Text size="2" weight="bold">
                {study.protocol}
              </Text>
              <Badge
                size="1"
                variant="soft"
                color={study.status === "ongoing" ? "green" : "gray"}
              >
                {study.status}
              </Badge>
            </Flex>
            <Flex gap="2" mt="1">
              <Text size="1" color="gray">
                Sponsor: {study.sponsor}
              </Text>
              {study.cro && (
                <Text size="1" color="gray">
                  CRO: {study.cro}
                </Text>
              )}
            </Flex>
          </Box>
          <IconButton size="1" variant="soft" color="red" onClick={onRemove}>
            <FiTrash2 />
          </IconButton>
        </Flex>

        <Separator size="2" />

        {/* Секция центров */}
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Flex gap="1" align="center">
              <FiMapPin size={14} />
              <Text size="1" weight="medium" color="gray">
                Assigned Sites
              </Text>
              {/* <Badge size="1" variant="surface">
                {user.assigned_site_id.filter(siteId => studySites.some(site => String(site.id) === String(siteId))).length} / {studySites.length}
              </Badge> */}
            </Flex>
          </Flex>
            <SiteSelector
              availableOptions={studySites}
              selectedValues={user.assigned_site_id}
              onChange={handleSiteChange}
              placeholder="Select sites..."
              disabled={false}
              user={user}
              showSiteDetails={true}
            />
        </Flex>

        {/* Секция стран */}
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Flex gap="1" align="center">
              <FiGlobe size={14} />
              <Text size="1" weight="medium" color="gray">
                Assigned Countries
              </Text>
              {/* <Badge size="1" variant="surface">
                {user.assigned_countries.length} / {studyCountries.length}
              </Badge> */}
            </Flex>
          </Flex>

              {/* <CountrySelector
                availableOptions={study.countries}
                selectedValues={tempCountry}
                onChange={handleCountryChange}
                placeholder="Select countries..."
                allowMultiple={true}
              /> */}
        </Flex>
      </Flex>
    </Card>
  );
};

export default StudyAssignmentCard;