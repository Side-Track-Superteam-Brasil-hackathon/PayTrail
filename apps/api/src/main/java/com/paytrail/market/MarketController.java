package com.paytrail.market;

import com.paytrail.auth.CurrentUser;
import com.paytrail.common.Enums.Role;
import com.paytrail.market.MarketDtos.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class MarketController {

    private final CurrentUser currentUser;
    private final MarketService service;

    public MarketController(CurrentUser currentUser, MarketService service) {
        this.currentUser = currentUser;
        this.service = service;
    }

    @GetMapping("/conversations")
    public List<ConversationDto> conversations() {
        return service.listConversations(currentUser.get());
    }

    @PostMapping("/conversations")
    public ConversationDto open(@RequestBody OpenConversationRequest req) {
        return service.openConversation(currentUser.get(), req.participantId());
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageDto> messages(@PathVariable UUID id,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after) {
        return service.listMessages(currentUser.get(), id, after);
    }

    @PostMapping("/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(@PathVariable UUID id, @RequestBody SendMessageRequest req) {
        return service.sendMessage(currentUser.get(), id, req.body());
    }

    @PostMapping("/conversations/{id}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public ProposalDto propose(@PathVariable UUID id, @RequestBody CreateProposalRequest req) {
        return service.createProposal(currentUser.get(), id, req);
    }

    @PostMapping("/proposals/{id}/accept")
    public ProposalDto accept(@PathVariable UUID id) {
        return service.accept(currentUser.get(), id);
    }

    @PostMapping("/proposals/{id}/reject")
    public ProposalDto reject(@PathVariable UUID id) {
        return service.reject(currentUser.get(), id);
    }

    @PostMapping("/proposals/{id}/cancel")
    public ProposalDto cancel(@PathVariable UUID id) {
        return service.cancel(currentUser.get(), id);
    }

    @GetMapping("/access")
    public List<AccessDto> access() {
        return service.listAccess(currentUser.get());
    }

    @PostMapping("/access/{id}/revoke")
    public AccessDto revoke(@PathVariable UUID id) {
        return service.revoke(currentUser.get(), id);
    }

    @GetMapping("/access/{id}/logs")
    public List<AccessLogDto> logs(@PathVariable UUID id) {
        return service.accessLogs(currentUser.get(), id);
    }

    @GetMapping("/accountant/clients")
    public List<ClientDto> clients() {
        currentUser.require(Role.ACCOUNTANT);
        return service.clients(currentUser.get());
    }
}
